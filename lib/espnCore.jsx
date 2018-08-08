/**
 * Tools and objects to map ESPN's animation production databases into ExtendScript for use in
 * Adobe graphics platforms such as AfterEffects, Photoshop, and Illustrator.
 *
 * @module espnCore
 *
 * @version 1.1.0
 * @author mark.rohrer@espn.com
 * 
 * 7/1/2018
 *
 */

$.evalFile(new File($.fileName).parent.fsName.toString() + '/json2.js');

var scriptRoot = new File($.fileName).parent.parent.parent.fsName;

espnCore = {
    'schema'       : [1.0, 1.1],
    'version'      : [1,1,0],
    'date'         : "7/15/2017",
    'logs'         : scriptRoot + "/.logs/{0}",
    'prodJson'     : scriptRoot + "/.json/{0}/{1}.json",
    'globJson'     : scriptRoot + "/.json/{0}.json"
};
/*************************************************************************************************
 * DATABASE VIRTUAL OBJECTS
 * These objects assist in conveniently accessing data from static JSON databases.
 * If we ever switch to Mongo or whatever, these will be mapped into that platform instead.
 ************************************************************************************************/
/**
 * ProductionData is an object to load and validate essential information about a Production. It
 * contains a copy of the teams.json and platform.json and keeps them updated to limit the number
 * of times the JSON has to be accessed on the server (for speed).
 * @class ProductionData
 * @constructor
 * @param {string} id - the database key for the production. If undefined, will instance a
 * null ProductionData object.
 */
function SportData ( id ) {
    var globalDb = espnCore['globJson'].format('productions');
    var prod_db = getJson( globalDb );
    if (!prod_db){
        alert('Issue loading global production database.');
        return null;
    } else {
        return prod_db;
    }
}

illegalCharacters = /[.,`~!@#$%^&*()=+\[\]]/;

/*************************************************************************************************
 * LOGGER
 * The logger object handles redirecting error messages to the user logs on the server.
 ************************************************************************************************/
/**
  * Log is an object that handles info, warning and error logging and assists in naming and
  * organization of the files.
  * @param {string} platform - The platformid of the software the logs will be generated from.
  */
function Log ( platform ) {
    // "level" is the level of information that the log will actually write (0: errors only,
    // 1: warnings & errors, 2: info, warnings & errors)
    var level   = 1;
    // The windows username of the artist whose logs are being written
    var userid = '';
    if ($.os.indexOf('Windows') > -1)
        userid  = $.getenv("USERNAME");
    else userid = "OSXUSER";
    // logfile location on the server
    var logDir  = new Folder(espnCore["logs"].format(userid));
    var logfile = new File("{0}/{1}.txt".format(logDir.fullName, platform));
    // preflight checks
    if (userid === undefined || userid === null) 
        return false;
    if (platform === undefined || platform === "")
        platform = "sys";
    if (!logDir.exists) 
        createFolder(logDir);
    /*
     * Creates a timestamp for each entry in the log
     * @returns {string} A timestamp
     */
    function getStamp () {
        var now = new Date();
        var month   = zeroFill(now.getMonth()+1, 2);
        var day     = zeroFill(now.getDate(), 2);
        var hours   = zeroFill(now.getHours(), 2);
        var minutes = zeroFill(now.getMinutes(), 2);
        var seconds = zeroFill(now.getSeconds(), 2);
        return "{0}/{1} {2}:{3}:{4}".format(month, day, hours, minutes, seconds);
    }
    /*
     * When logging an error or a warning, this organizes the stack trace to provide useful
     * information inside the log (the function that generated the error and the line #)
     * @returns {string} Parsed & simplified stack data
     */
    function getCaller () {
        var stack = $.stack.split('\n');
        if (stack.length === 5){
            return "{0} > {1}".format(stack[0], stack[1]);
        } else if (stack.length === 4) {
            return "{0}".format(stack[1]);
        }
    }
    /*
     * This method sets the threshold for logging (default 1 -- warnings and errors)
     * @param {number} lv - The threshhold to set (0: errors only, 1: include warnings, 2: include info)
     */
    this.setLevel = function (lv){
        level = lv;
    };
    /*
     * This method writes a new entry to the log.
     * @param {number} lv - The level of the entry (0: error, 1: warning, 2: info)
     * @param {string} message - The message to write to the log (in the case of errors, this
     *  message is also sent as an alert to the user.)
     * @param {(Error)} e - In the case of a try/catch scenario, the error object can be passed
     *  for additional parsing in the log.
     */
    this.write = function (lv, message, e) {
        // Do not write any entry if the level of the event is above the threshhold 
        if ( lv > level ) 
            return null;
        // Lookup the level of the message and include it a prefix to the log entry
        var lookup = {
            2: 'INFO   ',
            1: 'WARNING',
            0: 'ERROR  '
        };
        // Formatting the Error() data if it gets passed
        var errorData = "";
        if (e) {
            var pad = "               | line ";
            errorData = "{0}{1} > {2}".format(pad, e.line, e.message);
        }
        // Open the log file and write the data
        try {
            logfile.open("a");
            logfile.writeln('{0} | {1} : {2} : {3}'.format(getStamp(), lookup[lv], getCaller(), message));
            if (errorData != "") logfile.writeln(errorData);
        } catch(e) {
        } finally {
            logfile.close();
        }
        // Alert the user on errors (if the platform supports it)
        if (lv === 0 && platform === "ae"){
            alert(message);
            if (e) alert(e.stack);
        }
    };
}

/*************************************************************************************************
 * JSON HANDLING
 ************************************************************************************************/
/**
 * Parses a JSON file. Includes safe closing and error handling. Checks schema version against
 * script version to ensure failsafe in the event of non-backwards-compatibility.
 * @param {(string|File)} fileRef - A string or file object represnting the location of a JSON file
 * @returns {Object} A copy of JSON data
 */
function getJson (fileRef) {
    var db;
    //alert ('accessing: ' + fileRef);
    if (typeof fileRef === 'string') {
        fileRef = new File (fileRef);
    }
    if (!fileRef.exists){
        var log = new Log();
        log.write(0, 'Could not find requested JSON! >> {0}'.format(fileRef.fullName));
        db = null;
    }
    try {
        fileRef.open('r')
        var data = fileRef.read();
        db = JSON.parse(data);
    } catch (e) {
        alert('!JSON ERROR!\n' + fileRef.fullName);
        var log = new Log();
        log.write(0, 'Could not parse JSON! >> {0}'.format(fileRef.fullName));
        db = null;
    } finally {
        fileRef.close();
    }
    /*if (db["ESPN_META"]["version"] >= espnCore['compatible_schema'][0] &&
        db["ESPN_META"]["version"] <= espnCore['compatible_schema'][1]){
        // TODO - ERROR (?) -- HANDLE OLD VERSIONS OF DATABASE SCHEMA --
        // POSSIBLY JUST A CUSTOM ERROR TO OPEN A LEGACY VERSION OF ESPNTOOLS?
    }/**/
	return db;
}

/*************************************************************************************************
 * FILESYSTEM
 ************************************************************************************************/
/**
 * Creates a folder at the requested location (if it doesn't already exist)
 * @param {String} path - A string representing the folder (as fs or URI) you want to create
 * @returns {Folder} A folder object
 */
function createFolder (path) {
    var folderObj = new Folder(path);
    if (!folderObj.exists)
        folderObj.create();
    return folderObj;
}
/**
 * Recursively creates a folder structure based on a passed dictionary
 * @param {String} root - The starting directory in which the structure will be created
 * @param {Object} map - The dictionary represnting the structure
 */
function createFolders (root, map) {
    for (var f in map) {
        if (!map.hasOwnProperty(f)) continue;
        
        var folderStr = root + '/' + f;
        var folderObj = new Folder(folderStr);
        if (!folderObj.exists)
            folderObj.create();
        createFolders(folderStr, map[f]);
    }
}
/*
 * Creates a project folder structure for the given SceneData object
 */
function createProject (sceneData) {
    var projectRoot = sceneData.getFolder('projectroot');
    projectRoot = createFolder( projectRoot );
    createFolders( projectRoot.fullName, sceneData.prod.projstruct );
}

/*************************************************************************************************
 * QUICK GET HELPERS
 * These are shortcut functions to retrieve lists of major production elements (the productions
 * themselves, the projects in that production, teams, etc)
 ************************************************************************************************/
/**
  * A private filtering function used to filter folders vs file objects when using File.getFiles()
  * (Also excludes "hidden" folders beginning with .)
  * @returns {bool}
  */
function isFolder (FileObj) {
    if (FileObj instanceof Folder && FileObj.name.indexOf('.')!==0) 
        return true;
}
/**
  * Gets a string array of all productions (names) that are currently flagged as active in the db.
  * @returns {Array} An array of production id keys / names
  */
function getActiveProductions () {
    var prodJson = espnCore['globJson'].format("productions")
    var prod_db = getJson ( prodJson );
    var prodList = [];
    for (k in prod_db){
        if (!prod_db.hasOwnProperty(k)) continue;
        if (prod_db[k] === "ESPN_META" || prod_db[k] === "TEMPLATE") continue;
        if (prod_db[k]["live"]) prodList.push(k);
    }
    return prodList.sort();
}
/**
  * Gets a string array of all projects (names) belonging to a particular production.
  * @param {(string|ProductionData)} prodData - A production id key or ProductionData object
  * @returns {Array} An array of project names (as strings)
  */
function getAllProjects( prodData ) {
    (prodData instanceof ProductionData) ? null : prodData = new ProductionData( prodData );
    // get the root animation directory of the production
    root = prodData.root;
    if ($.os.indexOf('Macintosh') > -1) {
        root = prodData.root.replace('Y:', '/Volumes/cagenas');
    }
    var projectFolder = new Folder(root + prodData.folders["animroot"]);
    // get all folders from that directory
    var subFolders = projectFolder.getFiles(isFolder);
    // return list
    var projList = [];
    for (i in subFolders){
        if (!subFolders.hasOwnProperty(i)) continue;
        // isolate name of project folder
        var nameTokens = subFolders[i].fullName.split('/');
        // add it to the list
        projList.push(nameTokens[nameTokens.length-1]);
    }
    return projList.sort();
}
/**
  * Gets a copy of the JSON object storing the location of "global" assets -- i.e. those useful
  * to any & every production.
  * @returns {Object} A JSON object with lookups for asset locations on the server
  */
function getGlobalAssets() {
    var assetJson = espnCore["globJson"].format("global_assets");
    var globalAssetData = getJson( assetJson );
    return globalAssetData;
}

/*************************************************************************************************
 * MISCELLANEOUS STUFF
 ************************************************************************************************/
/**
  * Creates a timestamp for use in ESPN WIP renders and archiving.
  * @returns {string} A timestamp in the format "_<mmddyy>_<hhmmss>"
  */
function timestamp () {
    var t = Date();
    var d = t.split(' ');
    d = (d[1] + d[2]);
    t = t.split(' ')[4].split(':');
    t = (t[0] + t[1]);
    return ('_{0}_{1}'.format(d, t));
}
/**
  * This function takes a number and returns it as a string with preceding zeroes.
  * examples: 
  * zeroFill(5, 3) --> "005"
  * zeroFill(17, 5) --> "00017"
  * @param {number} number - The number to pad
  * @param {width} width - The total width of the returned string (in characters)
  * @returns {string} A zero-padded number
  */
function zeroFill (number, width){
    width -= number.toString().length;
    if ( width > 0 ) {
        return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
    }
    var i = (number + "");
    return i; // always return a string
}

Array.prototype.indexOf = function (searchElement, fromIndex) {
    var k;
    // 1. Let o be the result of calling ToObject passing
    //    the this value as the argument.
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }
    var o = Object(this);
    // 2. Let lenValue be the result of calling the Get
    //    internal method of o with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = o.length >>> 0;
    // 4. If len is 0, return -1.
    if (len === 0) {
      return -1;
    }
    // 5. If argument fromIndex was passed let n be
    //    ToInteger(fromIndex); else let n be 0.
    var n = fromIndex | 0;
    // 6. If n >= len, return -1.
    if (n >= len) {
      return -1;
    }
    // 7. If n >= 0, then Let k be n.
    // 8. Else, n<0, Let k be len - abs(n).
    //    If k is less than 0, then let k be 0.
    k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
    // 9. Repeat, while k < len
    while (k < len) {
      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the
      //    HasProperty internal method of o with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      //    i.  Let elementK be the result of calling the Get
      //        internal method of o with the argument ToString(k).
      //   ii.  Let same be the result of applying the
      //        Strict Equality Comparison Algorithm to
      //        searchElement and elementK.
      //  iii.  If same is true, return k.
      if (k in o && o[k] === searchElement) {
        return k;
      }
      k++;
    }
    return -1;

};

function lookup ( obj, lookup ) {
    function search ( obj, key ){
        var result;
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                if (k === key) {             
                    return obj[k][0];
                } else if ( JSON.stringify( obj[k][2] ) !== JSON.stringify({}) ){
                    result = search( obj[k][2], key );
                    if (result) return result;
                }
            } else continue;
        }
    } 
    return search(obj, lookup);
}

function lookup2 ( obj, key ){
    var result;
    for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
            if (k === key) {             
                return obj[k][0];
            } else if ( JSON.stringify( obj[k][2] ) !== JSON.stringify({}) ){
                result = search( obj[k][2], key );
                if (result) return result;
            }
        } else continue;
    }
    return null;
} 

String.prototype.format = function () {
    // Adds a .format() method to the String prototype, similar to python
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

String.prototype.toComment = function (){
  var converted = this;
  var arr = converted.split('\n');
  converted = "";
  for (i in arr){
    converted = converted + arr[i];
  } return converted;
};
/*
String.prototype.fromComment = function (){
  var converted = this;
  var arr = converted.split('\\n');
  converted = "";
  for (i in arr){
    converted = converted + arr[i] + "\n";
  } return converted;
};/**/
