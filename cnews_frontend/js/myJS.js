var sbZhong = 0;
window.onhashchange = function () {
    if (window.location.hash.length > 1) {
        var param = window.location.hash.substr(1);
        var query = param.substring(param.indexOf("?q=") + 3, param.indexOf("&cl="));
        var clusterNumber = param.substring(param.indexOf("&cl=") + 4, param.indexOf("&page="));
        var pageNumber = param.substring(param.indexOf("&page=") + 6);
        sendRequest(query, pageNumber, clusterNumber);
    } else {
        $("#resultPanel").slideUp("slow");
        $("#loading").fadeOut("slow");
        $("#curtain").slideDown("slow");
    }
}

window.onload = function () {
    if (window.location.hash.length > 1) {
        $("#curtain").slideUp("slow");
        window.onhashchange();
    }
}

function sendRequest(query, pageNumber, clusterNumber) {
    $("#resultPanel").slideUp("slow");
    $("#loading").fadeIn("slow");

    var url = "http://localhost:1993/search?q=" + query + '&cl=' + clusterNumber + '&page=' + pageNumber;
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            showSearchResult(xhttp.responseText);
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
    //maintain query string
    var hash = transFormHash();
    var input = document.getElementById("input");
    var query = document.getElementById("query");
    query.innerText = hash;
    input.value = hash;
}

function transFormQuery() {
    var oriQuery = document.getElementById("input").value;
    return oriQuery.replace(/ /g, "%20");
}

function transFormHash() {
    var oriHash = window.location.hash;
    oriHash = oriHash.substring(oriHash.indexOf("#q=") + 3, oriHash.indexOf("&cl="));
    return oriHash.replace(/%20/g, " ");
}

function searchButtonClicked() {
    var oriQuery = document.getElementById("input").value;
    if (oriQuery == "")
        return;

    var hash = "q=" + transFormQuery() + '&cl=' + 0 + '&page=' + 1;
    window.location.hash = hash;
    $("#curtain").slideUp("slow");   
}

function clusterSelected(clusterNumber) {
    var oriQuery = document.getElementById("query").innerText;
    if (oriQuery == "")
        return;

    var queryString = oriQuery.replace(/ /g, "%20");
    var hash = "q=" + queryString + '&cl=' + clusterNumber + '&page=' + 1;
    window.location.hash = hash;
}

function pageNumberSelected(pageNumber) {
    var oriQuery = document.getElementById("query").innerText;
    if (oriQuery == "")
        return;

    var queryString = oriQuery.replace(/ /g, "%20");
    var hash = "q=" + queryString + '&cl=' + sbZhong + '&page=' + pageNumber;
    window.location.hash = hash;
}

function showSearchResult(response) {
    var jsonObj = JSON.parse(response);
    
    //update number of result
    var newNumberOfResult = jsonObj.total_result;
    var numberOfResult = document.getElementById("numberOfResults");
    numberOfResult.innerText = newNumberOfResult + " Results";

    //update clusters
    var clusterList = document.getElementById("clusterList");
    while (clusterList.childElementCount != 0)
        clusterList.removeChild(clusterList.firstElementChild);
    var clusters = jsonObj.cluster;
    var type = jsonObj.type;
    var highLightClassName = "active";
    var clusterString = "";
    sbZhong = type;
    for (var i = 1; i <= clusters.length; i++) {
        if(type != i)
            clusterString += '<li><a style="cursor:pointer;" onclick="clusterSelected(' + i + ');">' + clusters[i - 1].toString() + '</a></li>';
        else
            clusterString += '<li class = "' + highLightClassName + '"><a style="cursor:pointer;" onclick="clusterSelected(' + i + ');">' + clusters[i - 1].toString() + '</a></li>';
    }
    clusterList.innerHTML = clusterString;
    var overviewTag = document.getElementById("overviewTag");
    overviewTag.classList.remove(highLightClassName);
    if (type == 0)
        overviewTag.classList.add(highLightClassName);

    //update main contents
    var newresults = jsonObj.result;
    var results = document.getElementById("results");
    while (results.childElementCount != 0)
        results.removeChild(results.firstElementChild);
    var resultString = "";
    for (var i = 0; i < newresults.length; i++) {
        resultString += '<h3 style="margin-bottom:0px;"><a href="' + newresults[i].url + '">' + newresults[i].title + '</a></h3>';
        resultString += '<span style="color:forestgreen;">' + newresults[i].url + '</span>';
        resultString += '<p style="margin-bottom:0px;"><span style="color:gray;">' + formalizeDate(newresults[i].date) + '</span>' + newresults[i].cotent + '</p>';
        resultString += '<span><a href="http://localhost:1993/snapshot?id=' + newresults[i].id + '">Cache Page</a></span>';
    }
    results.innerHTML = resultString;

    //update page number
    var currentPage = jsonObj.page;
    var totalPage = jsonObj.total_page;
    var pageList = document.getElementById("pageList");
    var pageToShow = 6;
    var pageStartIndex = currentPage - pageToShow / 2;
    var pageEndIndex = currentPage + pageToShow / 2;
    if (pageStartIndex < 1) {
        pageStartIndex = 1;
        pageEndIndex = pageStartIndex + pageToShow - 1;
    }
    if (pageEndIndex > totalPage) {
        pageEndIndex = totalPage;
        pageStartIndex = pageEndIndex - pageToShow + 1;
    }
    if (pageStartIndex < 1)
        pageStartIndex = 1;
    var highLightClassName = "active";
    var pageString = "";
    for (var i = pageStartIndex; i <= pageEndIndex; i++) {
        if (currentPage != i)
            pageString += '<li><a style="cursor:pointer;" onclick="pageNumberSelected(' + i + ');">' + i + '</a></li>';
        else
            pageString += '<li class = "' + highLightClassName + '"><a style="cursor:pointer;" onclick="pageNumberSelected(' + i + ');">' + i + '</a></li>';
    }
    if (currentPage != pageEndIndex)
        pageString += '<li><a style="cursor:pointer;" onclick="pageNumberSelected(' + (currentPage + 1) + ');">Next</a></li>';
    pageList.innerHTML = pageString;

    //show
    $("#loading").slideUp("slow");
    $("#resultPanel").slideDown("slow");
}

function formalizeDate(date) {
    if (date == "")
        return "";
    return date.substr(0, 4) + '/' + date.substr(4, 2) + '/' + date.substr(6, 2) + ' - ';
}

function DetectEnterPressed(e) {
    var characterCode
    if (e && e.which) { // NN4 specific code
        e = e
        characterCode = e.which
    }
    else {
        e = event
        characterCode = e.keyCode // IE specific code
    }
    if (characterCode == 13) // Enter key is 13
        searchButtonClicked();
}