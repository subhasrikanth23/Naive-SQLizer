function clearAll()
{
 $('#answer').empty();
}

function createSingleColTable(tableData, tableName, floatStyle)
{
  $('#answer').append('<table style="position: '+floatStyle+'">');
  $('#answer').append('<tr><th>' + tableName + '</th></tr>');
  tableData.forEach
  (
    function(cellData)
    {
      if(cellData != '')
      {
        $('#answer').append('<tr><td>' + cellData + '</td></tr>')
      }
    }
  );

  $('#answer').append('</table><br />');
}

function getTokens(queryValue)
{
    if (queryValue == "Enter a query!")
    {
        $('#answer').append("<p>No query entered.</p>");
        return;
    }
    var doc = nlp(queryValue);
    var properNouns = doc.nouns();
    var properNounArray = [];
    properNouns.forEach
    (
        function(properNoun)
        {
            if(!properNounArray.includes(properNoun.match("#Quotation").out("normal")))
            {
                properNounArray.push(properNoun.match("#Quotation").out("normal"));
            }
        }
    );
    var nouns = doc.nouns().toSingular();
    var nounArray = [];
    nouns = nouns.not("#Quotation");
    nouns.forEach
    (
        function(noun)
        {
            if(!nounArray.includes(noun.out("text")))
            {
                nounArray.push(noun.out("text").trim());
            }
        }
    );
    var adjectives = doc.adjectives();
    var adjectiveArray = [];
    adjectives.forEach
    (
        function(adjective)
        {
            if(!adjectiveArray.includes(adjective.out("text")))
            {
                if(adjective.out("text") == "unique")
                {
                    adjectiveArray.push("distinct".trim());
                }
                else
                {
                    adjectiveArray.push(adjective.out("text").trim());
                }
            }
        }
    );
    var verbs = doc.verbs();
    verbs.forEach
    (
        function(verb)
        {
            if(!adjectiveArray.includes(verb.out("text")) && verb.out("text") != "Get")
            {
                var verbOut = "";
                if(verb.out("text").trim() == "enjoy" || verb.out("text").trim() == "enjoys"|| verb.out("text").trim() == "like")
                {
                    verbOut = "likes";
                }
                else if(verb.out("text").trim() == "serve" || verb.out("text").trim() == "sell")
                {
                    verbOut = "sells";
                }
                else if(verb.out("text").trim() == "group")
                {
                    verbOut = "groups";
                }
                else
                {
                    verbOut = verb.out("text").trim();
                }
                adjectiveArray.push(verbOut);
            }
        }
    );
    returnArray = [properNounArray, nounArray, adjectiveArray];
    return returnArray;
}

function removeDuplicates(arr)
{
    let unique_array = []
    for(let i = 0;i < arr.length; i++){
        if(unique_array.indexOf(arr[i]) == -1)
        {
            unique_array.push(arr[i])
        }
    }
    return unique_array
}

function parse(queryValue, depth)
{
    $('#answer').append("<div id='line'><hr></div>");
    $('#answer').append("<p><i>Original query: </i>"+queryValue+"</p>");
    var tokenArray = getTokens(queryValue);
    var valueArray = removeDuplicates(tokenArray[0]);
    var fieldArray = removeDuplicates(tokenArray[1]);
    var keywordArray = removeDuplicates(tokenArray[2]);
    createSingleColTable(valueArray, "Values", 'left');
    createSingleColTable(fieldArray, "Fields",'center');
    createSingleColTable(keywordArray, "Keywords",'right');
    var naiveQuery = generateNaiveSQL(valueArray, fieldArray, keywordArray);
    if(naiveQuery != "")
    {
        $('#answer').append("<div id = 'final'><p><b>Naive SQL Query: </b>"+naiveQuery+"</p>");
    }
    else
    {
        $('#answer').append("<div id = 'final'><p><b>Naive SQL Query: </b>Cannot be generated.</p>");
    }
    var tokenArr = getTokens(queryValue);
    var valueArr = removeDuplicates(tokenArr[0]);
    var fieldArr = removeDuplicates(tokenArr[1]);
    var keywordArr = removeDuplicates(tokenArr[2]);
    var synthQuery = synthesizeQuery(valueArr, fieldArr, keywordArr, depth);
    if(synthQuery != "")
    {
        $('#answer').append("<p><b>Synthesized SQL Query: </b>"+synthQuery+"</p></div>");
    }
    else
    {
        $('#answer').append("<p><b>Synthesized SQL Query: </b>Cannot be synthesized.</p></div>");
    }
    var increaseDepthButton = document.createElement("button");
    increaseDepthButton.innerHTML = "Not complex enough?";
    $('#answer').append(increaseDepthButton);
    increaseDepthButton.addEventListener("click", function()
    {
        parse(queryValue, depth+1);
    });
    var decreaseDepthButton = document.createElement("button");
    if(depth > 0)
    {
        decreaseDepthButton.innerHTML = "Too complex?";
        $('#answer').append(decreaseDepthButton);
        decreaseDepthButton.addEventListener("click", function()
        {
            parse(queryValue, depth-1);
        });
    }
}

Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

function generateNaiveSQL(values, fields, keywords)
{
    var tables = ['beers','bars','drinkers','sells','likes','frequents'];
    var attributes =
    {
        'beers': ['name','manf'],
        'bars': ['name','addr','license'],
        'drinkers': ['name','addr','phone'],
        'sells': ['bar','beer','price'],
        'likes': ['drinker','beer'],
        'frequents': ['drinker','bar']
    };
    var subquery = "SELECT * FROM " + pluralize.plural(fields[0]) + " WHERE " + fields[1] + " = " + values[1];
    var query = "SELECT ";
    for (var keyword of keywords)
    {
        if(keyword = "all")
        {
            query += "* FROM ";
            break;
        }
        else
        {
            return "";
        }
    }
    usedFields = [];
    usedValues = [];
    referTables = [];
    for (var field of fields)
    {
        field = field.trim();
        field = pluralize.plural(field);
        for (var table of tables)
        {
            if (table == field)
            {
                query += field + " " + field.substr(0,2) + ", ";
                field = nlp(field).nouns().toSingular().out("text");
                usedFields.push(field);
                referTables.push(field.substr(0,2));
                break;
            }
        }
    }
    query += "WHERE ";
    while (usedFields.length < fields.length)
    {
        if(referTables.length > 0)
        {
            query += referTables[0] + ".";
            referTables.shift();
        }
        tableLoop:
            for (var table of tables)
            {
                usedFieldLoop:
                    for (var usedField of usedFields)
                    {
                        if (table == pluralize.plural(usedField))
                        {
                            fieldLoop:
                                for (var field of fields)
                                {
                                    field = field.trim();
                                    if (field == "name")
                                    {
                                        query +=  "name = ";
                                        usedFields.push(field);
                                        break tableLoop;
                                    }
                                }
                        }
                    }
            }
        values = values.clean("");
        var valueString = values.join(' ');
        if (usedFields[usedFields.length-1] == "name")
        {
            personName = nlp(valueString).match("#Person").out("array")[0];
            if(personName != '')
            {
                query += '"' + personName + '"';
                usedValues.push('"'+personName+'"');
            }
            else
            {
                query += '"' + nlp(valueString).match("#Quotation").out("array")[0] + '"';
                usedValues.push('"'+nlp(valueString).match("#Quotation").out("array")[0]+'"');
            }
        }
        values.shift();
        if (usedFields.length < fields.length)
        {
            query += " AND ";
        }
        else
        {
            query += ";";
            break;
        }
    }
    return query;
}

function generateSkeleton(depth,fields,keywords)
{
    if (depth == 0)
    {
        return "SELECT ? FROM ? WHERE ? = ?";
    }
    return "SELECT ? FROM ( " + generateSkeleton(depth - 1,fields,keywords)+" ) WHERE ? = ?";
}

function findUnknowns(str)
{
    return str == "?";
}

function findUndefined(str)
{
    var strArr = str.split(" ");
    for (var i of strArr)
    {
        if (i == "undefined" || i == "undefined;" || i == '"undefined";' || i == '"undefined"')
        {
            return 1;
        }
    }
    return 0;
}

function printArray(arr)
{
    for(var val of arr)
    {
        $('#answer').append(val + "<br />");
    }
}

function print(str)
{
    $('#answer').append(str + "<br />");
}

function synthesizeQuery(values, fields, keywords, depth)
{
    var tables = ['beers','bars','drinkers','sells','likes','frequents'];
    var attributes =
    {
        'beers': ['name','manf'],
        'bars': ['name','addr','license'],
        'drinkers': ['name','addr','phone'],
        'sells': ['bar','beer','price'],
        'likes': ['drinker','beer'],
        'frequents': ['drinker','bar']
    };
    var query = "";
    var syntax = ["SELECT","*","FROM","WHERE","GROUP BY","HAVING","ORDER BY","ASCENDING","DESCENDING","COUNT","MIN","MAX","AVERAGE"];
    var skeleton = generateSkeleton(depth,fields.length,keywords);
    var unknown = "?";
    $('#answer').append("<p><b>Synthesized SQL Skeleton: </b>"+skeleton+"</p>");
    var skeletonSplit = skeleton.split(" ");
    var indices = [];
    for(var i = 0; i < skeletonSplit.length; i++)
    {
        if (skeletonSplit[i] == '?')
        {
            indices.push(i);
        }
    }
    var tablesToUse = [];
    for (var fieldCheck of fields)
    {
        var fieldPlural = pluralize.plural(fieldCheck);
        if (tables.indexOf(fieldPlural) >= 0)
        {
            tablesToUse.push(fieldPlural);
        }
    }
    for (var keywordCheck of keywords)
    {
        var keywordPlural = pluralize.plural(keywordCheck);
        if (tables.indexOf(keywordPlural) >= 0)
        {
            tablesToUse.push(keywordPlural);
        }
        else if (tables.indexOf(keywordCheck) >= 0)
        {
            tablesToUse.push(keywordCheck);
        }
    }
    var attributesToUse = 
    {
        'beers': [],
        'bars': [],
        'drinkers': [],
        'sells': [],
        'likes': [],
        'frequents': []
    };
    for (var fieldCheck of fields)
    {
        for (var table in attributes)
        {
            if (attributes[table].indexOf(fieldCheck) >= 0)
            {
                attributesToUse[table].push(fieldCheck);
            }
        }
    }
    for (var keywordCheck of keywords)
    {
        for (var table in attributes)
        {
            if (attributes[table].indexOf(keywordCheck) >= 0)
            {
                attributesToUse[table].push(keywordCheck);
            }
        }
        if (keywordCheck == "sells")
        {
            attributesToUse["sells"].push("beer");
        }
        else if (keywordCheck == "frequents")
        {
            attributesToUse["frequents"].push("bar");
        }
        else if (keywordCheck == "likes")
        {
            attributesToUse["likes"].push("beer");
        }
    }
    var querySplit = skeletonSplit;
    var currentTable = "";
    while (indices.length > 0)
    {
        values = values.clean("");
        var valueString = values.join(' ');
        var index = indices[0];
        if (index != 0)
        {
            if (querySplit[index - 1] == "SELECT")
            {
                    querySplit[index] = "*";
            }
            else if (querySplit[index - 1] == "FROM")
            {
                currentTable = tablesToUse[tablesToUse.length - 1];
                querySplit[index] = currentTable;
                tablesToUse.splice(-1);
            }
            else if (querySplit[index - 1] == "WHERE" || querySplit[index - 1] == "AND")
            {
                querySplit[index] = attributesToUse[currentTable][attributesToUse[currentTable].length - 1];
                attributesToUse[currentTable].splice(-1);
            }
            else if (querySplit[index - 1] == "=")
            {
                querySplit[index] = '"' + values[values.length - 1] + '"';
                values.splice(-1);
            }
            else
            {
                querySplit[index] = "?";
            }
        }
        indices.shift();
    }
    for(var i = 0; i < querySplit.length; i++)
    {
        if(i < querySplit.length - 1)
        {
            query += querySplit[i] + " ";
        }
        else
        {
            query += querySplit[i] + ";";
        }
    }
    print("<b>Pre-Unknown-Check Synthesized Query: </b>" + query)
    if (querySplit.find(findUnknowns) || findUndefined(query))
    {
        return "";
    }
    return query;
}