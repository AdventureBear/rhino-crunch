var stepped = 0,
  chunks = 0,
  rows = 0;
var start, end;
var parser;
var pauseChecked = false;
var printStepChecked = false;
var userSummary = [];
var newSummary = {};
//var CSVready = [];

$(function() {
  $('#submit-parse').click(function() {
    stepped = 0;
    chunks = 0;
    rows = 0;

    var txt = $('#input').val();
    var localChunkSize = $('#localChunkSize').val();
    var remoteChunkSize = $('#remoteChunkSize').val();
    var files = $('#files')[0].files;
    var config = buildConfig();

    
     $('#date').combodate();   
    // NOTE: Chunk size does not get reset if changed and then set back to empty/default value
    if (localChunkSize)
      Papa.LocalChunkSize = localChunkSize;
    if (remoteChunkSize)
      Papa.RemoteChunkSize = remoteChunkSize;

    pauseChecked = $('#step-pause').prop('checked');
    printStepChecked = $('#print-steps').prop('checked');

    if (files.length > 0) {
      if (!$('#stream').prop('checked') && !$('#chunk').prop('checked')) {
        for (var i = 0; i < files.length; i++) {
          if (files[i].size > 1024 * 1024 * 10) {
            alert("A file you've selected is larger than 10 MB; please choose to stream or chunk the input to prevent the browser from crashing.");
            return;
          }
        }
      }

      start = performance.now();

      $('#files').parse({
        config: config,
        before: function(file, inputElem) {
          console.log("Parsing file:", file);
        },
        complete: function() {

          console.log("Done with all files.");
        }
      });
    } else {
      start = performance.now();
      var results = Papa.parse(txt, config);
      console.log("Synchronous parse results:", results);
    }
  });

  $('#submit-unparse').click(function() {
    //var input = $('#input').val();

    var input = userSummary;
    var delim = $('#delimiter').val();

    var results = Papa.unparse(input, {
      delimiter: delim
    });

    console.log("Unparse complete!");
    console.log("--------------------------------------");
    console.log(results);
    console.log("--------------------------------------");

  });

  $("#download-csv").click(function() {
    console.log("CSV Downlaod Clicked");
    downloadCSV({
      filename: "CSVData.csv"
    });
  })

  
  $("#score").click(function(){
    //total up score
    //So, the first five columns divide by 10, the next two (team call & SC) are just added, and the last column (volume) is divide by 50.
  })

  $('#insert-tab').click(function() {
    $('#delimiter').val('\t');
  });
});

  function downloadCSV(args) {
    var reformatted = reformatBindObjforCSV(newSummary);
    console.log("Download CSV Function");
    var data, filename, link;
    var csv = convertArrayOfObjectsToCSV({
      data: reformatted
    });
    if (csv == null) return;

    filename = args.filename || 'export.csv';

    if (!csv.match(/^data:text\/csv/i)) {
      csv = 'data:text/csv;charset=utf-8,' + csv;
    }
    data = encodeURI(csv);

    link = document.createElement('a');
    link.setAttribute('href', data);
    link.setAttribute('download', filename);
    link.click();
  }

  function convertArrayOfObjectsToCSV(args) {
    var result, ctr, keys, columnDelimiter, lineDelimiter, data;
    console.log("Converting objects to CSV", args);

    data = args.data || null;
    if (data == null || !data.length) {
      console.log("Data is null");
      return null;
    }

    columnDelimiter = args.columnDelimiter || ',';
    lineDelimiter = args.lineDelimiter || '\n';

    keys = Object.keys(data[0]);
    console.log("Keys: ", keys);

    result = '';
    result += keys.join(columnDelimiter);
    result += lineDelimiter;

    data.forEach(function(item) {
      ctr = 0;
      keys.forEach(function(key) {
        if (ctr > 0) result += columnDelimiter;

        result += item[key];
        ctr++;
      });
      result += lineDelimiter;
    });

    return result;
  }
  //http://halistechnology.com/2015/05/28/use-javascript-to-export-your-data-as-csv/

function buildConfig() {
  return {
    delimiter: $('#delimiter').val(),
    newline: getLineEnding(),
    header: $('#header').prop('checked'),
    dynamicTyping: $('#dynamicTyping').prop('checked'),
    preview: parseInt($('#preview').val() || 0),
    step: $('#stream').prop('checked') ? stepFn : undefined,
    encoding: $('#encoding').val(),
    worker: $('#worker').prop('checked'),
    comments: $('#comments').val(),
    complete: completeFn,
    error: errorFn,
    download: $('#download').prop('checked'),
    fastMode: $('#fastmode').prop('checked'),
    skipEmptyLines: $('#skipEmptyLines').prop('checked'),
    chunk: $('#chunk').prop('checked') ? chunkFn : undefined,
    beforeFirstChunk: undefined,
  };

  function getLineEnding() {
    if ($('#newline-n').is(':checked'))
      return "\n";
    else if ($('#newline-r').is(':checked'))
      return "\r";
    else if ($('#newline-rn').is(':checked'))
      return "\r\n";
    else
      return "";
  }
}

function stepFn(results, parserHandle) {
  stepped++;
  rows += results.data.length;

  parser = parserHandle;

  if (pauseChecked) {
    console.log(results, results.data[0]);
    parserHandle.pause();
    return;
  }

  if (printStepChecked)
    console.log(results, results.data[0]);
}

function chunkFn(results, streamer, file) {
  if (!results)
    return;
  chunks++;
  rows += results.data.length;

  parser = streamer;

  if (printStepChecked)
    console.log("Chunk data:", results.data.length, results);

  if (pauseChecked) {
    console.log("Pausing; " + results.data.length + " rows in chunk; file:", file);
    streamer.pause();
    return;
  }
}

function errorFn(error, file) {
  console.log("ERROR:", error, file);
}

function completeFn() {
  end = performance.now();
  if (!$('#stream').prop('checked') &&
    !$('#chunk').prop('checked') &&
    arguments[0] &&
    arguments[0].data)
    rows = arguments[0].data.length;

  console.log("Finished input (async). Time:", end - start, arguments);
  console.log("Rows:", rows, "Stepped:", stepped, "Chunks:", chunks);

  evaluateData(arguments[0]);

}

function evaluateData(allData) {
  var records = allData.data;
  //console.log(records);
  //Build array of unique users
  var uniqueUsers = [];

  var uniqueUsers = records
    .map(function(obj) {
      return obj["Created By"];
    })
    .filter(function(name, i, arr) {
      //clever trick to get only first occurances ie unique
      if (arr.indexOf(name) == i && name != "") {
        return name;
      }
    })


  //create "blank" userSummary array
  uniqueUsers.forEach(function(user) {
    var obj = {
      'CreatedBy': user,
      'New Contacts': 0,
      'New Invites (Challenge Groups)': 0,
      'New Invites (Coaching Opportunity)': 0,
      'New Follow Ups': 0,
      'New Challenger Check-Ins': 0,
      'Team Call Participation (National upline team or our team)': 0,
      'Team Call Participation (National, upline team, or our team)': 0,
      'SCPoints': 0,
      'Volume': 0
    }
    userSummary.push(obj);
  })

  
  //console.log(userSummary[0]);

  //fill user summary array with actual data
  //console.log("user summary keys", Object.keys(userSummary[0]));
  var attributes = Object.keys(userSummary[0]);
  //console.log(attributes);
  //Strip "created by" from remainign attributes
  //User summary already has 'created by' as start of each element.
  attributes.shift();

  userSummary.forEach(function(user, i) {
    records.forEach(function(record, j) {
      if (record['Created By'] === user['CreatedBy']) {
        //strip all but numbers & alpha characters
        var myName = user['CreatedBy'].replace(/[^a-zA-Z0-9]/g, ''); // <--regex removes non alphanum chars
        user['CreatedBy'] = myName;
        console.log(myName);
        attributes.forEach(function(key) {
          //turn null sc points & volume from spreadsheet into 0
          if (record[key] == null) {
            var val = 0;
          } else {
            val = record[key];
          }
          user[key] += parseInt(val);
          //console.log(key);
        });
      }
    });

    //User summed up, next
    //Clean up New Challenger Check ins
    if (user['Team Call Participation (National, upline team, or our team)'] >= 3) {
      user['Team Call Participation (National, upline team, or our team)'] = 3;
    }
    
    //clean up key name to remove commas
    user['Team Call Participation (National upline team or our team)'] = user['Team Call Participation (National, upline team, or our team)'];
   delete user['Team Call Participation (National, upline team, or our team)'];
    

  });

  
  
  
  
  
  var bindObj = {};


  userSummary.forEach(function(user) {
    var name = user['CreatedBy'];
    newSummary[name] = user;
    //create binding object
    bindObj[name + '.CreatedBy'] = '.created-by-' + name;
    bindObj[name + '.SCPoints'] = '.sc-points-' + name;
    bindObj[name + '.Volume'] = '.volume-' + name;
  });

  console.log(JSON.stringify(newSummary.ryanc));

  //console.log(JSON.stringify(bindObj));

  var timerID = setTimeout(function() {
    var boundUser = Bind(
      newSummary,
      bindObj
    );
  }, 1000);

  createHTMLforBind(userSummary);

  //console.log(JSON.stringify(bindObj));
  //sendObjToHTML(userSummary);

}

function reformatBindObjforCSV(newSummary){
  var CSVready=[];
  var users = Object.keys(newSummary);
  users.forEach(function(user){
    CSVready.push(newSummary[user]);
  })
  
  console.log(CSVready);
  return CSVready;

  
};

function getMonth(obj){
  
}

function createHTMLforBind(userSummary) {
  var userStr = '';
  var headerStr = "<table class='bordered highlight'>  <thead><tr><th>User</th><th>New Contacts</th><th>Invites-Groups</th><th>Invites-Coaching</th><th>New Follow Ups</th><th>New Check-Ins</th><th>Team Call (max 3)</th><th>SC Points</th><th>Volume</th></tr>  </thead>";


  userSummary.forEach(function(user) {
    var userStr = "<tr><td><div class='created-by-" + user['CreatedBy'] + "'></div></td>";
    userStr += "<td>" + user['New Contacts'] + "</td>";
    userStr += "<td>" + user['New Invites (Challenge Groups)'] + "</td>";
    userStr += "<td>" + user['New Invites (Coaching Opportunity)'] + "</td>";
    userStr += "<td>" + user['New Follow Ups'] + "</td>";
    userStr += "<td>" + user['New Challenger Check-Ins'] + "</td>";
    userStr += "<td>" + user['Team Call Participation (National upline team or our team)'] + "</td>";
    userStr += "<td>" + "<input type='text' class='inline sc-points-" + user['CreatedBy'] + "'></input></td>";
    userStr += "<td>" + "<input type='text' class='inline volume-" + user['CreatedBy'] + "'></input></td></tr>";
    headerStr += userStr;
  })
  var closingStr = "</table>";
  var fullStr = headerStr + closingStr;
  //console.log(fullStr);

  $('#uniqueUsers').append(fullStr);
};

function sendObjToHTML(userSummary) {
  var userStr = '';
  var headerStr = "<table class='bordered highlight'>  <thead><tr><th>User</th><th>New Contacts</th><th>Invites-Groups</th><th>Invites-Coaching</th><th>New Follow Ups</th><th>New Check-Ins</th><th>Team Call (max 3)</th><th>SC Points</th><th>Volume</th></tr>  </thead>";

  userSummary.forEach(function(user) {
    var userStr = "<tr><td>" + user['CreatedBy'] + "</td>";
    console.log(userStr);
    userStr += "<td>" + user['New Contacts'] + "</td>";
    userStr += "<td>" + user['New Invites (Challenge Groups)'] + "</td>";
    userStr += "<td>" + user['New Invites (Coaching Opportunity)'] + "</td>";
    userStr += "<td>" + user['New Follow Ups'] + "</td>";
    userStr += "<td>" + user['New Challenger Check-Ins'] + "</td>";
    userStr += "<td>" + user['Team Call Participation (National upline team or our team)'] + "</td>";
    userStr += "<td>" + "<input class='input-sc-'></input>" + "</td>";
    userStr += "<td>" + "<input class='input-vol-'></input>" + "</td></tr>";
    headerStr += userStr;

  })

  var closingStr = "</table>";
  var fullStr = headerStr + closingStr;
  $('#uniqueUsers').append(fullStr);

}

/*JS for input file
       //update file upload label with name of file
      //http://tympanus.net/codrops/2015/09/15/styling-customizing-file-inputs-smart-way/*/
var inputs = $('.inputfile');

Array.prototype.forEach.call(inputs, function(input) {
  var label = input.nextElementSibling,
    labelVal = label.innerHTML;
  input.addEventListener('change', function(e) {
    var fileName = '';
    fileName = e.target.value.split('\\').pop();
    if (fileName)
      label.querySelector('span').innerHTML = fileName;
    else
      label.innerHTML = labelVal;
  });
});