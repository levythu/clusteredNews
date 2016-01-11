package SearchEngine;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map.Entry;
import java.util.Scanner;
import java.util.Set;
import java.util.Calendar;

import org.bson.types.ObjectId;

import Jama.Matrix;
import Jama.SingularValueDecomposition;

import com.mongodb.BasicDBObject;
import com.mongodb.MongoClient;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;

import static com.mongodb.client.model.Filters.*;

class SearchAnswer {
	public Document doc;
	public double sim;
	
	SearchAnswer() {
		doc = null;
		sim = 0;
	}
	
	SearchAnswer(Document doc, double sim) {
		this.doc = doc;
		this.sim = sim;
	}
}

class TermRank {
	public String term;
	public double num;
	
	TermRank() {
		term = null;
		num = 0;
	}
	
	TermRank(String term, double num) {
		this.term = term;
		this.num = num;
	}
}

class ClusterResult {
	public SearchAnswer[] docList;
	public String[] termList;
	
	ClusterResult() {
		docList = null;
		termList = null;
	}
}

class SearchAnswerComparator implements Comparator<SearchAnswer>{
	
	@Override
	public int compare(SearchAnswer sa1, SearchAnswer sa2) {
		if (sa1.sim > sa2.sim)
			return -1;
		else if (sa1.sim < sa2.sim)
			return 1;
		else
			return 0;
	}
}

class TermRankComparator implements Comparator<TermRank>{
	
	@Override
	public int compare(TermRank tr1, TermRank tr2) {
		if (tr1.num > tr2.num)
			return -1;
		else if (tr1.num < tr2.num)
			return 1;
		else
			return 0;
	}
}

class ClusterResultComparator implements Comparator<ClusterResult>{
	
	@Override
	public int compare(ClusterResult cr1, ClusterResult cr2) {
		if (cr1.docList.length > cr2.docList.length)
			return -1;
		else if (cr1.docList.length < cr2.docList.length)
			return 1;
		else
			return 0;
	}
}

class DisplayResult {
	public String url;
	public String title;
	public String content;
	public String id;
	public String date;
	
	DisplayResult() {
		url = null;
		title = null;
		content = null;
		id = null;
		date = null;
	}
}

public class Engine {
	private HashMap<String, InverseDocIndex> invDocMap;
	private HashMap<String, Document> docIndex;
	private int total_doc_num;
	private String dbHost;
	private int dbPort;
	
	public Engine() {
		invDocMap = new HashMap<String, InverseDocIndex>();
		docIndex = new HashMap<String, Document>();
		total_doc_num = 0;
		dbHost = "localhost";
		dbPort = 27017;
	}
	
	public void setDB(String host, int port) {
		dbHost = host;
		dbPort = port;
	}
	
	public void insertDoc(Document doc) {
		if (docIndex.containsKey(doc.getDocId()))
			return;
		Set<String> termSet = doc.getTermSet();
		Iterator<String> it;
		String term;
		InverseDocIndex invDocInd;
		
		it = termSet.iterator();
		while (it.hasNext()) {
			term = it.next();
			invDocInd = invDocMap.get(term);
			if (invDocInd == null) {
				invDocInd = new InverseDocIndex(term);
				invDocMap.put(term, invDocInd);
			}
			invDocInd.insertDoc(doc);
		}
		if (docIndex.put(doc.getDocId(), doc) == null)
			total_doc_num++;
	}
	
	public void removeDoc(Document doc) {
		if (!docIndex.containsKey(doc.getDocId()))
			return;
		Iterator<InverseDocIndex> it = invDocMap.values().iterator();
		InverseDocIndex invDocInd;
		ArrayList<String> termList = new ArrayList<String>();
		while (it.hasNext()) {
			invDocInd = it.next();
			invDocInd.removeDoc(doc);
			if (invDocInd.getDocNum() == 0)
				termList.add(invDocInd.getTerm());
		}
		Iterator<String> it_s = termList.iterator();
		String term;
		while (it_s.hasNext()) {
			term = it_s.next();
			invDocMap.remove(term);
		}
		docIndex.remove(doc.getDocId());
		total_doc_num--;
	}
	
	public void updateDoc(Document doc) {
		removeDoc(doc);
		insertDoc(doc);
	}
	
	public SearchAnswer[] search(String[] query) {
		SearchAnswer[] ans;
		SearchAnswer[] finalAns;
		ans = initialEstimate(query);
		ans = improvingEstimate(query, ans);
		ans = dateWeighting(ans);
		
		double selected_rate = 0.6;
		int max_ans_num = 500;
		int len = (int)(ans.length * selected_rate + 1);
		if (len > max_ans_num)
			len = max_ans_num;
		if (len > ans.length)
			len = ans.length;
		finalAns = new SearchAnswer[len];
		for (int i = 0; i < len; i++)
			finalAns[i] = ans[i];
		
		return finalAns;
	}
	
	public SearchAnswer[] initialEstimate(String[] query) {
		SearchAnswer[] ans = null;
		HashMap<Document, Double> candidate = new HashMap<Document, Double>();
		String term;
		InverseDocIndex invDocInd;
		HashMap<String, Integer> docMap;
		Iterator<Entry<String, Integer>> it;
		Entry<String, Integer> entry;
		Iterator<Entry<Document, Double>> it_d;
		Entry<Document, Double> entry_d;
		Document doc;
		SearchAnswerComparator sac = new SearchAnswerComparator();
		double r, sim;
		
		for (int i = 0; i < query.length; i++) {
			term = query[i];
			invDocInd = invDocMap.get(term);
			if (invDocInd == null)
				continue;
			docMap = invDocInd.getDocMap();
			it = docMap.entrySet().iterator();
			r = (double)invDocInd.getDocNum() / total_doc_num;
			sim = Math.log1p((1-r)/r);
			while (it.hasNext()) {
				entry = it.next();
				doc = invDocInd.getDocById(entry.getKey());
				if (!candidate.containsKey(doc)) {
					candidate.put(doc, sim*(1+(double)entry.getValue()/doc.getTotalNum()));
				}
				else {
					double sim_old = candidate.get(doc);
					candidate.put(doc, sim_old + sim*(1+(double)entry.getValue()/doc.getTotalNum()));
				}
			}
		}
		
		ans = new SearchAnswer[candidate.size()];
		it_d = candidate.entrySet().iterator();
		for (int i = 0; i < ans.length; i++) {
			entry_d = it_d.next();
			ans[i] = new SearchAnswer(entry_d.getKey(), entry_d.getValue());
		}
		Arrays.sort(ans, sac);
		return ans;
	}
	
	public SearchAnswer[] improvingEstimate(String[] query, SearchAnswer[] initAns) {
		SearchAnswer[] ans = null;
		HashMap<Document, Double> candidate = new HashMap<Document, Double>();
		String term;
		InverseDocIndex invDocInd;
		HashMap<String, Integer> docMap;
		Iterator<Entry<String, Integer>> it;
		Entry<String, Integer> entry;
		Iterator<Entry<Document, Double>> it_d;
		Entry<Document, Double> entry_d;
		Document doc;
		SearchAnswerComparator sac = new SearchAnswerComparator();
		double p, r, sim, selected_rate = 0.3;
		int n, v, len = (int)(selected_rate * initAns.length + 1);
		if (len > initAns.length)
			len = initAns.length;
		
		for (int i = 0; i < query.length; i++) {
			term = query[i];
			invDocInd = invDocMap.get(term);
			if (invDocInd == null)
				continue;
			docMap = invDocInd.getDocMap();
			it = docMap.entrySet().iterator();
			n = invDocInd.getDocNum();
			v = 0;
			for (int j = 0; j < len; j++)
				if (initAns[j].doc.lookUpTerm(term) != 0)
					v++;
			p = (v + (double)n/total_doc_num) / (len + 1);
			r = (n-v + (double)n/total_doc_num) / (total_doc_num-len + 1);
			sim = Math.log((1 + p/(1-p))*(1 + (1-r)/r));
			while (it.hasNext()) {
				entry = it.next();
				doc = invDocInd.getDocById(entry.getKey());
				if (!candidate.containsKey(doc)) {
					candidate.put(doc, sim*(1+(double)entry.getValue()/doc.getTotalNum()));
				}
				else {
					double sim_old = candidate.get(doc);
					candidate.put(doc, sim_old + sim*(1+(double)entry.getValue()/doc.getTotalNum()));
				}
			}
		}
		
		ans = new SearchAnswer[candidate.size()];
		it_d = candidate.entrySet().iterator();
		for (int i = 0; i < ans.length; i++) {
			entry_d = it_d.next();
			ans[i] = new SearchAnswer(entry_d.getKey(), entry_d.getValue());
		}
		Arrays.sort(ans, sac);
		return ans;
	}
	
	public SearchAnswer[] dateWeighting(SearchAnswer[] initAns) {
		SearchAnswerComparator sac = new SearchAnswerComparator();
		double nor_fac, cor, date_weight;
		String date;
		int year, month, day;
		Calendar doc_calendar = Calendar.getInstance();
		Calendar today_calendar = Calendar.getInstance();
		long doc_milli, today_milli, diff_day;
		if (initAns == null || initAns.length == 0)
			return (new SearchAnswer[0]);
		else
			nor_fac = initAns[0].sim;
		
		today_milli = today_calendar.getTimeInMillis();
		for (int i = 0; i < initAns.length; i++) {
			cor = initAns[i].sim / nor_fac;
			
			date = initAns[i].doc.getDocDate();
			if (date == null || date.length() == 0)
				date_weight = 0.1;
			else {
				year = Integer.parseInt(date.substring(0, 4));
				month = Integer.parseInt(date.substring(4, 6)) - 1;
				day = Integer.parseInt(date.substring(6, 8));
				doc_calendar.set(year, month, day);
				doc_milli = doc_calendar.getTimeInMillis();
				diff_day = (today_milli - doc_milli) / ((long)(24 * 60 * 60 * 1000));
				if (diff_day < 0)
					diff_day = 0;
				date_weight = 1.0 / (diff_day + 2);
			}
			
			initAns[i].sim = cor + date_weight;
		}
		
		Arrays.sort(initAns, sac);
		return initAns;
	}
	
	public ClusterResult[] cluster(SearchAnswer[] initAns, int cl_num) {
		ClusterResult[] ans = null;
		if (initAns.length == 0)
			return new ClusterResult[0];
		int r_num = initAns.length, c_num;
		HashMap<String, Double> termWeight = new HashMap<String, Double>();
		HashMap<String, Integer> termIndex = new HashMap<String, Integer>();
		HashMap<Integer, String> indexTerm = new HashMap<Integer, String>();
		Iterator<String> it_s;
		String term;
		TermRank[] tr_arr;
		TermRankComparator trc = new TermRankComparator();
		double[][] mat;
		int total, freq;
		Integer index;
		Document doc;
		double[] idf;
		
		c_num = 0;
		for (int i = 0; i < initAns.length; i++) {
			doc = initAns[i].doc;
			it_s = doc.getTermSet().iterator();
			total = doc.getTotalNum();
			while (it_s.hasNext()) {
				term = it_s.next();
				Double w = termWeight.get(term);
				if (w == null)
					w = 0.0;
				w += doc.lookUpTerm(term) / total;
				termWeight.put(term, w);
				Integer n = termIndex.get(term);
				if (n == null) {
					n = 0;
					c_num++;
				}
				termIndex.put(term, n+1);
			}
		}
		
		tr_arr = new TermRank[c_num];
		for (int i = 0; i < c_num; i++)
			tr_arr[i] = new TermRank();
		it_s = termWeight.keySet().iterator();
		index = 0;
		while (it_s.hasNext()) {
			term = it_s.next();
			Double w = termWeight.get(term);
			Integer n = termIndex.get(term);
			double w_new = w/r_num * Math.log((double)r_num/n);
			tr_arr[index].term = term;
			tr_arr[index].num = w_new;
			index++;
		}
		Arrays.sort(tr_arr, trc);
		
		c_num = 0;
		for (int i = 0; i < tr_arr.length; i++) {
			term = tr_arr[i].term;
			if (term.length() == 1)
				continue;
			if (term.equals("which") || term.equals("while") || term.equals("much") || term.equals("job") || term.equals("jeb") || term.equals("jet") || term.equals("joe") || term.equals("jim") || term.equals("answer") || term.equals("border") || term.equals("meet") || term.equals("twin") || term.equals("road") || term.equals("florida") || term.equals("drop") || term.equals("big") || term.equals("thought") || term.equals("space"))
				continue;
			try {
				Double.parseDouble(term);
			}
			catch (NumberFormatException e) {
				c_num++;
			}
		}
		
		if (c_num > 200)
			c_num = 200;
		idf = new double[c_num];
		for (int i = 0, j = 0; j < c_num; i++) {
			term = tr_arr[i].term;
			if (term.length() == 1)
				continue;
			if (term.equals("which") || term.equals("while") || term.equals("much") || term.equals("job") || term.equals("jeb") || term.equals("jet") || term.equals("joe") || term.equals("jim") || term.equals("answer") || term.equals("border") || term.equals("meet") || term.equals("twin") || term.equals("road") || term.equals("florida") || term.equals("drop") || term.equals("big") || term.equals("thought") || term.equals("space"))
				continue;
			try {
				Double.parseDouble(term);
			}
			catch (NumberFormatException e) {
				idf[j] = Math.log((double)r_num/termIndex.get(term));
				j++;
			}
		}
		
		termIndex.clear();
		for (int i = 0, j = 0; j < c_num; i++) {
			term = tr_arr[i].term;
			term = tr_arr[i].term;
			if (term.length() == 1)
				continue;
			if (term.equals("which") || term.equals("while") || term.equals("much") || term.equals("job") || term.equals("jeb") || term.equals("jet") || term.equals("joe") || term.equals("jim") || term.equals("answer") || term.equals("border") || term.equals("meet") || term.equals("twin") || term.equals("road") || term.equals("florida") || term.equals("drop") || term.equals("big") || term.equals("thought") || term.equals("space"))
				continue;
			try {
				Double.parseDouble(term);
			}
			catch (NumberFormatException e) {
				termIndex.put(term, j);
				indexTerm.put(j, term);
				j++;
			}
		}
		
		mat = new double[r_num][c_num];
		for (int i = 0; i < initAns.length; i++) {
			doc = initAns[i].doc;
			it_s = doc.getTermSet().iterator();
			total = doc.getTotalNum();
			while (it_s.hasNext()) {
				term = it_s.next();
				index = termIndex.get(term);
				if (index == null)
					continue;
				freq = doc.lookUpTerm(term);
				mat[i][index] = (double)freq/total + idf[index];
			}
		}
		
		Matrix matrix = new Matrix(mat);
		SingularValueDecomposition s;
		Matrix V;
		Matrix S;
		Matrix U;
		if (matrix.getRowDimension() >= matrix.getColumnDimension()) {
			s = matrix.svd();
			U = s.getU();
			S = s.getS();
			V = s.getV();
		}
		else {
			s = matrix.transpose().svd();
			V = s.getU();
			S = s.getS();
			U = s.getV();
		}
		if (cl_num > initAns.length)
			cl_num = 1;
		if (cl_num > S.getRowDimension())
			cl_num = S.getRowDimension();
		U = U.getMatrix(0, U.getRowDimension()-1, 0, cl_num-1);
		S = S.getMatrix(0, cl_num-1, 0, cl_num-1);
		V = V.getMatrix(0, V.getRowDimension()-1, 0, cl_num-1);
		
		double[][] doc_feature = U.getArray();
		int[] init_center = initialKmeans(doc_feature, cl_num);
		ArrayList<Integer>[] cl_list = iterationKmeans(doc_feature, cl_num, init_center);
		
		ans = new ClusterResult[cl_list.length];
		for (int i = 0; i < cl_list.length; i++) {
			ans[i] = new ClusterResult();
			int len = cl_list[i].size();
			ans[i].docList = new SearchAnswer[len];
			SearchAnswer[] list = ans[i].docList;
			for (int j = 0; j < len; j++)
				list[j] = initAns[cl_list[i].get(j)];
		}
		
		double[][] mat_new = (U.times(S)).times(V.transpose()).getArray();
		int length = mat_new[0].length;
		double[] term_weight_sum = new double[length];
		int term_num = length > 3 ? 3 : length;
		for (int i = 0; i < cl_list.length; i++) {
			ans[i].termList = new String[term_num];
			Iterator<Integer> it = cl_list[i].iterator();
			for (int j = 0; j < length; j++)
				term_weight_sum[j] = 0.0;
			double[] term_weight;
			while (it.hasNext()) {
				index = it.next();
				term_weight = mat_new[index];
				for (int j = 0; j < length; j++)
					term_weight_sum[j] += term_weight[j];
			}
			int[] flag = new int[length];
			for (int j = 0; j < term_num; j++) {
				int maxFlag = -1;
				double maxDis = -Double.MAX_VALUE;
				for (int k = 0; k < length; k++) {
					if (term_weight_sum[k] > maxDis && flag[k] == 0) {
						maxDis = term_weight_sum[k];
						maxFlag = k;
					}
				}
				ans[i].termList[j] = indexTerm.get(maxFlag);
				flag[maxFlag] = 1;
			}
		}
		
		ClusterResultComparator crc = new ClusterResultComparator();
		Arrays.sort(ans, crc);
		return ans;
	}
	
	public int[] initialKmeans(double[][] feature, int cl_num) {
		int[] ans = new int[cl_num];
//		double[] max = new double[cl_num];
		java.util.Random rand = new java.util.Random((long)((feature[0][0] + 0.19940701) * 19930703));
		
//		for (int i = 0; i < cl_num; i++) {
//			ans[i] = -1;
//			max[i] = -Double.MAX_VALUE;
//			int len = feature.length;
//			for (int j = 0; j < len; j++) {
//				if (feature[j][i] > max[i]) {
//					int k;
//					for (k = 0; k < i; k++) {
//						if (j == ans[k])
//							break;
//					}
//					if (k < i)
//						continue;
//					max[i] = feature[j][i];
//					ans[i] = j;
//				}
//			}
//		}
		
		for (int i = 0; i < cl_num; i++) {
			while (true) {
				double n = rand.nextDouble();
				int candidate = (int)(n * feature.length);
				int j;
				for (j = 0; j < i; j++) {
					if (candidate == ans[j])
						break;
				}
				if (j < i)
					continue;
				ans[i] = candidate;
				break;
			}
		}
		
		return ans;
	}
	
	public ArrayList<Integer>[] iterationKmeans(double[][] doc_feature, int cl_num, int[] init_center) {
		ArrayList<Integer>[] ans = new ArrayList[cl_num];
		int i, j, k;
		
		for (i = 0; i < cl_num; i++)
			ans[i] = new ArrayList<Integer>();
		int f_dim = doc_feature[0].length;
		double[][] center = new double[cl_num][f_dim];
		for (i = 0; i < cl_num; i++) {
			for (j = 0; j < f_dim; j++)
				center[i][j] = doc_feature[init_center[i]][j];
		}
		
		int flag = 1;
		long start, end, eclipse;
		long maxIterationTime = 5000;
		start = end = System.currentTimeMillis();
		eclipse = 0;
		int[] cl_label = new int[doc_feature.length];
		for (i = 0; i < cl_label.length; i++)
			cl_label[i] = -2;
		while (flag == 1 && eclipse <= maxIterationTime) {
			flag = 0;
			for (i = 0; i < cl_num; i++)
				ans[i] = new ArrayList<Integer>();
			
			for (i = 0; i < doc_feature.length; i++) {
				int minLabel = -1;
				double minDist = Double.MAX_VALUE;
				double[] doc_f = doc_feature[i];
				for (j = 0; j < cl_num; j++) {
					double tempDist = 0.0, dt;
					double[] cen = center[j];
					for (k = 0; k < f_dim; k++) {
						dt = doc_f[k] - cen[k];
						tempDist += dt * dt;
					}
					if (tempDist < minDist) {
						minDist = tempDist;
						minLabel = j;
					}
				}
				if (minLabel != cl_label[i])
					flag = 1;
				cl_label[i] = minLabel;
				ans[minLabel].add(i);
			}
			
			for (i = 0; i < cl_num; i++) {
				for (j = 0; j < f_dim; j++)
					center[i][j] = 0.0;
				int len = ans[i].size();
				double[] cen = center[i];
				for (j = 0; j < len; j++) {
					double[] doc_f = doc_feature[ans[i].get(j)];
					for (k = 0; k < f_dim; k++)
						cen[k] += doc_f[k];
				}
				for (j = 0; j < f_dim; j++)
					cen[j] /= len;
			}
			
			end = System.currentTimeMillis();
			eclipse = end - start;
		}
		
		return ans;
	}
	
	public void kmeansTest() {
		double[][] f = {{1,0,0},{1,0,0.2},{1,0,1},{0,0.8,0},{0,1,0}};
		int[] init_center = initialKmeans(f, 3);
		ArrayList<Integer>[] cl_list = iterationKmeans(f, 3, init_center);
		for (int i = 0; i < cl_list.length; i++) {
			for (int j = 0; j < cl_list[i].size(); j++) {
				System.out.print(cl_list[i].get(j) + " ");
			}
			System.out.println();
		}
	}
	
	public void updateInverseDocIndexFromDB() {
		MongoClient mongoClient = new MongoClient(dbHost, dbPort);
		MongoDatabase db = mongoClient.getDatabase("cnews");
		MongoCollection<org.bson.Document> docList = db.getCollection("terms");
		BasicDBObject query = new BasicDBObject();
		query.put("__checked__", new BasicDBObject("$exists", false));
		System.out.println("Total webpage# to be updated: " + docList.count(query));
		docList.updateMany(query, new org.bson.Document("$set", new org.bson.Document("__checked__", 2)));
		org.bson.Document query2 = new org.bson.Document("__checked__", 2);
		FindIterable<org.bson.Document> cursor = docList.find(query2);
		MongoCursor<org.bson.Document> it = cursor.iterator();
		Iterator<Entry<String, Object>> kv_it;
		Entry<String, Object> entry;
		org.bson.Document doc;
		Document doc_new;
		String key;
		int i = 0;
		
		while (it.hasNext()) {
			doc = it.next();
			kv_it = doc.entrySet().iterator();
			doc_new = new Document();
			while (kv_it.hasNext()) {
				entry = kv_it.next();
				key = entry.getKey();
				if (key.equals("__url__") || key.equals("_id"))
					continue;
				else if (key.equals("__id__"))
					doc_new.setDocId(entry.getValue().toString());
				else if (key.equals("__newsTime__"))
					doc_new.setDocDate(entry.getValue().toString());
				else {
					if (entry.getValue().toString().equals("NaN"))
						continue;
					else
						doc_new.insertTerm(key, Integer.parseInt(entry.getValue().toString()));
				}
			}
			updateDoc(doc_new);
			if ((++i) % 500 == 0)
				System.out.println("Updating webpage#: " + i);
		}
		docList.updateMany(query2, new org.bson.Document("$set", new org.bson.Document("__checked__", 1)));
		System.out.println("Updating finished.");
		System.out.println("Total webpage#: " + i);
		
		mongoClient.close();
	}
	
	public void buildInverseDocIndexFromDB() {
		MongoClient mongoClient = new MongoClient(dbHost, dbPort);
		MongoDatabase db = mongoClient.getDatabase("cnews");
		MongoCollection<org.bson.Document> docList = db.getCollection("terms");
		System.out.println("Total webpage# to be loaded: " + docList.count());
		docList.updateMany(new org.bson.Document(), new org.bson.Document("$set", new org.bson.Document("__checked__", 2)));
		org.bson.Document query2 = new org.bson.Document("__checked__", 2);
		FindIterable<org.bson.Document> cursor = docList.find(query2);
		MongoCursor<org.bson.Document> it = cursor.iterator();
		Iterator<Entry<String, Object>> kv_it;
		Entry<String, Object> entry;
		org.bson.Document doc;
		Document doc_new;
		String key;
		int i = 0;
		
		while (it.hasNext()) {
			doc = it.next();
			kv_it = doc.entrySet().iterator();
			doc_new = new Document();
			while (kv_it.hasNext()) {
				entry = kv_it.next();
				key = entry.getKey();
				if (key.equals("__url__") || key.equals("_id"))
					continue;
				else if (key.equals("__id__"))
					doc_new.setDocId(entry.getValue().toString());
				else if (key.equals("__newsTime__"))
					doc_new.setDocDate(entry.getValue().toString());
				else {
					if (entry.getValue().toString().equals("NaN"))
						continue;
					else
						doc_new.insertTerm(key, Integer.parseInt(entry.getValue().toString()));
				}
			}
			insertDoc(doc_new);
			if ((++i) % 500 == 0)
				System.out.println("Loading webpage#: " + i);
		}
		docList.updateMany(query2, new org.bson.Document("$set", new org.bson.Document("__checked__", 1)));
		System.out.println("Loading finished.");
		System.out.println("Total webpage#: " + i);
		
		mongoClient.close();
	}
	
	public String getSnapshotFromDB(String id) {
		String snapshot = null;
		MongoClient mongoClient = new MongoClient(dbHost, dbPort);
		MongoDatabase db = mongoClient.getDatabase("cnews");
		MongoCollection<org.bson.Document> docList = db.getCollection("rawhtml");
		
		org.bson.Document doc = docList.find(eq("_id", new ObjectId(id))).first();
		snapshot = (String)doc.get("raw");
		mongoClient.close();
		return snapshot;
	}
	
	public void getOriginalWordFromDB(ClusterResult[] cl) {
		MongoClient mongoClient = new MongoClient(dbHost, dbPort);
		MongoDatabase db = mongoClient.getDatabase("cnews");
		MongoCollection<org.bson.Document> docList = db.getCollection("lex");
		
		for (int i = 0; i < cl.length; i++) {
			String[] termList = cl[i].termList;
			for (int j = 0; j < termList.length; j++) {
				FindIterable<org.bson.Document> cursor = docList.find(eq("stemmed", termList[j]));
				MongoCursor<org.bson.Document> it = cursor.iterator();
				org.bson.Document doc;
				int max_num = Integer.MIN_VALUE;
				String ori = null;
				while (it.hasNext()) {
					doc = it.next();
					Integer temp = (Integer)doc.get("count");
					if (temp != null && temp > max_num) {
						max_num = temp;
						ori = (String)doc.get("original");
					}
				}
				cl[i].termList[j] = ori;
			}
		}
		
		mongoClient.close();
	}
	
	public DisplayResult[] getDisplayResultFromDB(SearchAnswer[] sr, int start, int end, String[] words_trans) {
		DisplayResult[] res = new DisplayResult[end-start+1];
		MongoClient mongoClient = new MongoClient(dbHost, dbPort);
		MongoDatabase db = mongoClient.getDatabase("cnews");
		MongoCollection<org.bson.Document> docList = db.getCollection("rawhtml");
		
		int index = 0;
		for (int i = start; i <= end; i++, index++) {
			Document doc = sr[i].doc;
			String id = doc.getDocId();
			org.bson.Document doc_db = docList.find(eq("_id", new ObjectId(id))).first();
			res[index] = new DisplayResult();
			res[index].url = (String)doc_db.get("url");
			res[index].title = ((String)doc_db.get("title")).replaceAll("\"", "\'").replaceAll("\t", " ").replaceAll("\r\n", " ").replaceAll("\n", " ").replaceAll("\r", " ");
			res[index].date = (String)doc_db.get("newsTime");
			res[index].id = id;
			String content = ((String)doc_db.get("content")).replaceAll("\"", "\'");
			content = content.replaceAll("\r\n", " ");
			content = content.replaceAll("\n", " ");
			content = content.replaceAll("\r", " ");
			content = content.replaceAll("\t", " ");
			res[index].content = highlightKeyWord(content, words_trans);
		}
		
		mongoClient.close();
		return res; 
	}
	
	public String highlightKeyWord(String content_ori, String[] keys_trans) {
		String content_new = null;
		String[] words_ori = content_ori.split(" ");
		Stemmer st = new Stemmer();
		String[] words_trans = new String[words_ori.length];
		for (int i = 0; i < words_trans.length; i++)
			words_trans[i] = st.transform(words_ori[i]);
		int abs_word_num = 50;
		int max_flag = -1;
		int max_num = Integer.MIN_VALUE;
		int end = (words_trans.length-1) / abs_word_num;
		if (end < 0)
			end = 0;
		
		for (int i = 0; i <= end; i++) {
			int s = i * abs_word_num;
			int e = s + abs_word_num - 1;
			if (e >= words_trans.length)
				e = words_trans.length - 1;
			int num = 0;
			for (int j = s; j <= e; j++) {
				for (int k = 0; k < keys_trans.length; k++) {
					if (words_trans[j].equals(keys_trans[k])) {
						num++;
						break;
					}
				}
			}
			if (num > max_num) {
				max_num = num;
				max_flag = i;
			}
		}
		
		int s = max_flag * abs_word_num;
		int e = s + abs_word_num - 1;
		if (e >= words_trans.length)
			e = words_trans.length - 1;
		StringBuffer con = new StringBuffer();
		for (int j = s; j <= e; j++) {
			int k;
			for (k = 0; k < keys_trans.length; k++) {
				if (words_trans[j].equals(keys_trans[k])) {
					con.append("<span style=\'color:red\'>" + words_ori[j] + "</span>");
					break;
				}
			}
			if (k == keys_trans.length)
				con.append(words_ori[j]);
			if (j != e)
				con.append(" ");
		}
		content_new = con.toString();
		
		return content_new;
	}
	
	public void server() {		
		Scanner s = new Scanner(System.in);
		String str;
		String[] str_arr;
		SearchAnswer[] ans;
		ClusterResult[] cl;
		Stemmer st = new Stemmer();
		
		while (true) {
			str = s.nextLine();
			if (str.equals("__exit__"))
				return;
			str = st.transform(str);
			str_arr = str.split(" ");
			ans = search(str_arr);
			System.out.println(ans.length);
			cl = cluster(ans, 5);
			if (cl == null || cl.length == 0)
				continue;
			for (int i = 0; i < cl.length; i++) {
				for (int j = 0; j < cl[i].termList.length; j++)
					System.out.print(cl[i].termList[j] + " ");
				System.out.println(": " + cl[i].docList.length);
			}
		}
	}
	
	public void test() {
		String[] termList = {"apple", "computer", "energy", "food", "mouse", "orange", "power"};
		int[][] docTerm = {{10,0,0,0,20,0,0}, {11,0,22,33,0,44,0}, {12,0,0,0,24,0,0}, {0,13,26,0,0,0,39}};
		Document[] docList = new Document[4];
		
		for (int i = 0; i < docTerm.length; i++) {
			docList[i] = new Document(Integer.toString(i), "20151212");
			for (int j = 0; j < termList.length; j++) {
				docList[i].insertTerm(termList[j], docTerm[i][j]);
			}
		}
		
		Engine eng = new Engine();
		for (int i = 0; i < docTerm.length; i++) {
			eng.insertDoc(docList[i]);
		}
		
		//test
		Iterator<String> it = eng.invDocMap.keySet().iterator();
		while (it.hasNext())
			System.out.println(it.next());
		System.out.println(docList[0].lookUpTerm("apple"));
		
		String[] query = {"power", "computer", "food", "energy", "apple"};
		SearchAnswer[] ans = eng.search(query);
		
		//eng.kmeansTest();
		System.out.println(ans[0].doc.getDocId() + ": " + ans[0].sim);
		System.out.println(ans[1].doc.getDocId() + ": " + ans[1].sim);
		
		ClusterResult[] cl = eng.cluster(ans, 2);
		
		System.out.print(cl[0].termList[0] + " " + cl[0].termList[1] + " " + cl[0].termList[2] + ": ");
		for (int j = 0; j < cl[0].docList.length; j++) {
			System.out.print(cl[0].docList[j].doc.getDocId() + " ");
		}
		System.out.println();
		System.out.print(cl[1].termList[0] + " " + cl[1].termList[1] + " " + cl[1].termList[2] + ": ");
		for (int j = 0; j < cl[1].docList.length; j++) {
			System.out.print(cl[1].docList[j].doc.getDocId() + " ");
		}
		System.out.println();
	}
	
	public static void main(String[] args) {
		Engine eng = new Engine();
//		eng.test();
		eng.setDB("localhost", 27017);
		eng.buildInverseDocIndexFromDB();
		eng.server();
		return;
	}
}
