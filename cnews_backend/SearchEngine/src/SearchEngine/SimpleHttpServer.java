package SearchEngine;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.Hashtable;
import java.util.Scanner;

import javax.servlet.http.*;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.Headers;

public class SimpleHttpServer {
	static private Engine eng;
	static private int result_per_page = 10;
	
	public static void main(String[] args) throws Exception {
		eng = new Engine();
		eng.setDB("localhost", 27017);
		eng.buildInverseDocIndexFromDB();
		
		HttpServer server = HttpServer.create(new InetSocketAddress(1993), 0);
	    server.createContext("/snapshot", new SnapHandler());
	    server.createContext("/search", new SearchHandler());
	    server.setExecutor(null); // creates a default executor
	    server.start();
	    Scanner s = new Scanner(System.in);
	    while (true) {
	    	String str = s.nextLine();
	    	if (str.equals("shutdown"))
	    		break;
	    	if (str.equals("update"))
	    		eng.updateInverseDocIndexFromDB();
	    }
	    server.stop(0);
	}
	
	static class SnapHandler implements HttpHandler {
		public void handle(HttpExchange t) throws IOException {
			String query = t.getRequestURI().getQuery();
			if (query == null) {
				String response = "Query syntax error!";
				t.sendResponseHeaders(400, response.length());
				OutputStream os = t.getResponseBody();
				os.write(response.getBytes());
				os.close();
				return;
			}
			
			Hashtable<String, String[]> para = HttpUtils.parseQueryString(query);
			String[] id_arr = para.get("id");
			
			if (id_arr == null || id_arr.length == 0) {
				String response = "Query syntax error!";
				t.sendResponseHeaders(400, response.length());
				OutputStream os = t.getResponseBody();
				os.write(response.getBytes());
				os.close();
				return;
			}
			else {
				String id = id_arr[0];
				String snapshot = eng.getSnapshotFromDB(id);
				if (snapshot == null) {
					String response = "Snapshot not found!";
					t.sendResponseHeaders(400, response.length());
					OutputStream os = t.getResponseBody();
					os.write(response.getBytes());
					os.close();
					return;
				}
				Headers h = t.getResponseHeaders();
				h.add("Content-Type", "text/html");
				byte[] res = snapshot.getBytes();
				t.sendResponseHeaders(200, res.length);
				OutputStream os = t.getResponseBody();
				os.write(res, 0, res.length);
				os.close();
			}
	    }
	}

	static class SearchHandler implements HttpHandler {
		public void handle(HttpExchange t) throws IOException {
			String query = t.getRequestURI().getQuery();
			if (query == null) {
				String response = "Query syntax error!";
				t.sendResponseHeaders(400, response.length());
				OutputStream os = t.getResponseBody();
				os.write(response.getBytes());
				os.close();
				return;
			}
			
			Hashtable<String, String[]> para = HttpUtils.parseQueryString(query);
			String[] q = para.get("q");
			
			if (q == null || q.length == 0) {
				String response = "Query syntax error!";
				t.sendResponseHeaders(400, response.length());
				OutputStream os = t.getResponseBody();
				os.write(response.getBytes());
				os.close();
				return;
			}
			else {
				Stemmer st = new Stemmer();
				String[] words = q[0].split(" ");
				String q_trans = st.transform(q[0]);
				String[] words_trans = q_trans.split(" ");
				
				SearchAnswer[] ans = eng.search(words_trans);
				ClusterResult[] cl_ans = eng.cluster(ans, 5);
				
				String[] page = para.get("page");
				int page_num, start, end;
				try {
					if (page == null || page.length == 0)
						page_num = 1;
					else
						page_num = Integer.parseInt(page[0]);
				}
				catch (Exception e) {
					page_num = 1;
				}
				start = (page_num - 1) * result_per_page;
				end = page_num * result_per_page - 1;
				
				eng.getOriginalWordFromDB(cl_ans);
				String[] cl = para.get("cl");
				int type;
				if (cl == null || cl.length == 0) {
					type = 0;
				}
				else {
					try {
						type = Integer.parseInt(cl[0]);
						if (type > cl_ans.length)
							type = 0;
					}
					catch (Exception e) {
						type = 0;
					}
				}
				
				Headers h = t.getResponseHeaders();
				h.add("Content-Type", "application/json");
				h.add("Access-Control-Allow-Origin", "*");
				h.add("Access-Control-Allow-Methods", "GET");
				StringBuffer json = new StringBuffer();
				json.append("{\r\n");
				json.append("  \"key_word\": [");
				for (int i = 0; i < words.length; i++) {
					json.append("\"" + words[i].replaceAll("\"", "\'") + "\"");
					if (i != words.length-1)
						json.append(", ");
				}
				json.append("],\r\n");
				json.append("  \"cluster_result_num\": [");
				for (int i = 0; i < cl_ans.length; i++) {
					json.append(cl_ans[i].docList.length);
					if (i != cl_ans.length - 1)
						json.append(", ");
				}
				json.append("],\r\n");
				json.append("  \"cluster\": [\r\n");
				for (int i = 0; i < cl_ans.length; i++) {
					json.append("    [");
					String[] termList = cl_ans[i].termList;
					for (int j = 0; j < termList.length; j++) {
						json.append("\"");
						json.append(termList[j].replaceAll("\"", "\'"));
						json.append("\"");
						if (j != termList.length-1)
							json.append(", ");
					}
					json.append("]");
					if (i != cl_ans.length-1)
						json.append(",");
					json.append("\r\n");
				}
				json.append("  ],\r\n");
				json.append("  \"type\": " + type + ",\r\n");
				
				json.append("  \"result\": [\r\n");
				SearchAnswer[] result;
				if (type == 0)
					result = ans;
				else
					result = cl_ans[type-1].docList;
				int total_result = result.length;
				if (total_result == 0)
					;
				else {
					if (start >= total_result) {
						page_num = (total_result-1) / result_per_page + 1;
						start = (page_num - 1) * result_per_page;
						end = page_num * result_per_page - 1;
					}
					if (end >= total_result)
						end = total_result - 1;
					DisplayResult[] dr = eng.getDisplayResultFromDB(result, start, end, words_trans);
					for (int i = 0; i < dr.length; i++) {
						json.append("    {\r\n");
						json.append("      \"url\": \"" + dr[i].url + "\",\r\n");
						json.append("      \"title\": \"" + dr[i].title + "\",\r\n");
						json.append("      \"date\": \"" + dr[i].date + "\",\r\n");
						json.append("      \"id\": \"" + dr[i].id + "\",\r\n");
						json.append("      \"cotent\": \"" + dr[i].content + "\"\r\n");
						json.append("    }");
						if (i != dr.length-1)
							json.append(",");
						json.append("\r\n");
					}
				}
				json.append("  ],\r\n");
				json.append("  \"page\": " + page_num + ",\r\n");
				json.append("  \"total_page\": " + ((total_result-1) / result_per_page + 1) + ",\r\n");
				json.append("  \"total_result\": " + result.length + "\r\n");
				json.append("}");
				
				byte[] res = json.toString().getBytes();
				t.sendResponseHeaders(200, res.length);
				OutputStream os = t.getResponseBody();
				os.write(res, 0, res.length);
				os.close();
			}
		}
	}
}