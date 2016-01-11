package SearchEngine;

import java.util.HashMap;
import java.util.Set;

public class Document {
	private HashMap<String, Integer> termMap;
	private int total_num;
	private String docId;
	private String date;
	
	public Document() {
		termMap = new HashMap<String, Integer>();
		total_num = 0;
		docId = null;
	}
	
	public Document(String id, String date) {
		termMap = new HashMap<String, Integer>();
		total_num = 0;
		docId = id;
		this.date = date;
	}
	
	public void insertTerm(String str, int num) {
		Integer num_old = termMap.get(str);
		if (num_old != null) {
			total_num -= num_old;
		}
		termMap.put(str, num);
		total_num += num;
		if (num == 0)
			termMap.remove(str);
	}
	
	public int lookUpTerm(String str) {
		Integer num = termMap.get(str);
		if (num == null)
			return 0;
		return num;
	}
	
	public Set<String> getTermSet() {
		return termMap.keySet();
	}
	
	public int getTotalNum() {
		return total_num;
	}
	
	public String getDocId() {
		return docId;
	}
	
	public String getDocDate() {
		return date;
	}
	
	public void setDocId(String id) {
		docId = id;
	}
	
	public void setDocDate(String date) {
		this.date = date;
	}
}
