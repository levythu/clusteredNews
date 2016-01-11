package SearchEngine;

import java.util.HashMap;

public class InverseDocIndex {
	private String term;
	private int doc_num;
	private int total_term_num;
	private HashMap<String, Integer> docMap;
	private HashMap<String, Document> docIndex;
	
	public InverseDocIndex() {
		term = new String();
		doc_num = 0;
		total_term_num = 0;
		docMap = new HashMap<String, Integer>();
		docIndex = new HashMap<String, Document>();
	}
	
	public InverseDocIndex(String str) {
		term = str;
		doc_num = 0;
		total_term_num = 0;
		docMap = new HashMap<String, Integer>();
		docIndex = new HashMap<String, Document>();
	}
	
	public void setTerm(String str) {
		term = str;
	}
	
	public String getTerm() {
		return term;
	}
	
	public void insertDoc(Document doc) {
		if (term == null) {
			System.out.println("Forget to initialize InverseDocIndex term name!");
			return;
		}
		Integer num_old = docMap.get(doc.getDocId());
		Integer num_new = doc.lookUpTerm(term);
		if (num_old != null) {
			doc_num--;
			total_term_num -= num_old;
		}
		if (num_new == null)
			num_new = 0;
		docMap.put(doc.getDocId(), num_new);
		docIndex.put(doc.getDocId(), doc);
		doc_num++;
		total_term_num += num_new;
		if (num_new == 0) {
			docMap.remove(doc.getDocId());
			docIndex.remove(doc.getDocId());
			doc_num--;
		}
	}
	
	public void removeDoc(Document doc) {
		if (!docIndex.containsKey(doc.getDocId()))
			return;
		Integer num_old = docMap.get(doc.getDocId());
		doc_num--;
		total_term_num -= num_old;
		docMap.remove(doc.getDocId());
		docIndex.remove(doc.getDocId());
	}
	
	public int lookUpDoc(Document doc) {
		Integer num = docMap.get(doc.getDocId());
		if (num == null)
			return 0;
		return num;
	}
	
	public Document getDocById(String id) {
		return docIndex.get(id);
	}
	
	public HashMap<String, Integer> getDocMap() {
		return docMap;
	}
	
	public int getDocNum() {
		return doc_num;
	}
	
	public int getTotalTermNum() {
		return total_term_num;
	}
}
