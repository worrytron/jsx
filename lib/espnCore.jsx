/**
 * Tools and objects to map ESPN's animation production databases into ExtendScript for use in
 * Adobe graphics platforms such as AfterEffects, Photoshop, and Illustrator.
 *
 * SceneData is the primary object in usage, and once constructed it has the following structure.
 * 
 * SceneData
 * - SceneData.prod -> a ProductionData object
 * - SceneData.teams -> an array of TeamData objects
 *
 * @module espnCore
 *
 * @version 1.0.3
 * @author mark.rohrer@espn.com
 * 
 * 12/11/2017
 *
 */

$.evalFile(new File($.fileName).parent.fsName.toString() + '/json2.js');

var scriptRoot = new File($.fileName).parent.parent.parent.fsName;

espnCore = {
    'schema'       : [1.0, 1.0],
    'version'      : [1,0,3],
    'date'         : "12/15/2017",
    'platform'     : null,
    'dashboard'    : "0. Dashboard",
    'logs'         : scriptRoot + "/.logs/{0}",
    'prodJson'     : scriptRoot + "/.json/{0}/{1}.json",
    'globJson'     : scriptRoot + "/.json/{0}.json"
};

/**
 * STATUS flags assist in the flow of execution while a scene is in the process of being
 * modified. Various functions will set changed states, and validation functions will 
 * then modify the status to reflect the result of validation.
 */
STATUS = {
    'UNDEFINED'  : 0999, // new instance / no tag data found / miscellaneous bad news
    'NO_DEST'    : 1000, // destination folders do not exist
    'CHECK_DEST' : 1001, // a version/name change cascade must be validated
    'UNSAVED'    : 1002, // set during team changes, template builds, etc. soft warning state.
    'OK'         : 1003, // validation check passed -- ready to write to disk
    'OK_WARN'    : 1004, // validation check passed -- file already exists with that name
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
function ProductionData ( id ) {
    var globalDb = espnCore['globJson'].format('productions');
    this.prod_db = getJson( globalDb );
    if (!this.prod_db){
        alert('Issue loading global production database.');
        return null;
    }
    /**
     * The database key, name, and production id of the production currently loaded.
     * @property name
     * @type String
     */
    this.name = 'NULL';
    /**
     * The root folder of the production on cagenas. (ex: Y:\Workspace\MASTER_PROJECTS\PRODUCTION)
     * @property root
     * @type String
     */
    this.root = 'NULL';
    /**
     * The root folder of the databases used by this production on cagenas.
     *
     *      var prod = new ProductionData('NBA');
     *      $.writeln(prod.root);
     *      >> '/y/Workspace/MASTER_PROJECTS/NBA'
     *
     * @property dbroot
     * @type string
     */
    this.dbroot    = 'NULL';
    this.pubroot   = 'NULL';

    this.teamdata  = false;
    this.showdata  = false;
    this.platdata  = false;
    this.platid    = '';
    this.is_live   = null;
    this.dbversion = 0;
    /**
      * This method loads a production database and initializes the ProductionData object
      * @method load
      * @param {string} id - The production's key in the database.
      */
    this.load = function (id) {
        (id === undefined) ? id = 'NULL' : null;
        //prod_db = prod_db[id];
        //if (prod_db === undefined) // TODO -- ERROR -- PROD NOT FOUND IN DB
        this.name      = id;
        this.is_live   = this.prod_db[id]['live'];
        this.dbversion = this.prod_db[id]['vers'];
        this.root      = this.prod_db[id]['root'];
        this.pubroot   = this.prod_db[id]['pub'];
        this.folders   = this.prod_db[id]['folder_lookup'];
        this.projstruct = this.prod_db["FOLDER_TEMPLATE"]["PROJECT"];
    };
    /*
     * This method stores a copy of the current production's entire teams.json as an 
     * object member called ProductionData.teams.
     * This *should not* be used directly in a script, and teams should be set and accessed
     * using the SceneData.setTeam() method and SceneData.teams array respectively.
     */
    this.loadTeamData = function () {
        if (!this.teamdata || this.name != this.teams["ESPN_META"]["production"]) {
            var teamJson = espnCore['prodJson'].format(this.name, "teams");
            var teamDb = getJson( teamJson );
            var teamList = new Array();
            for (t in teamDb){
                if ((t == "NULL") || (t == "ESPN_META")) continue;
                teamList.push(t);
            }
            this.teams = teamDb;
            this.teamlist = teamList.sort();
            this.teamdata = true;
        }
    };
    /*
     * LOAD SHOW DATA TODO: ADD COMMENTS
     */
    this.loadShowData = function () {
        var showJson = espnCore['prodJson'].format(this.name, "shows");
        var showDb = getJson ( showJson );
        var showList = new Array();
        for (s in showDb) {
            if ((s == "NULL") || (s == "ESPN_META")) continue;
            showList.push(s);
        }
        this.shows = showDb;
        this.showlist = showList.sort();
        this.showdata = true;
    }
    /*
     * LOAD SPONSOR DATA TODO: ADD COMMENTS
     */
    this.loadSponsorData = function () {
        var sponsorJson = espnCore['prodJson'].format(this.name, "sponsors");
        var sponsorDb = getJson ( sponsorJson );
        var sponsorList = new Array();
        for (s in sponsorDb) {
            if ((s == "NULL") || (s == "ESPN_META")) continue;
            sponsorList.push(s);
        }
        this.sponsors = sponsorDb;
        this.sponsorlist = sponsorList.sort();
        this.sponsordata = true;
    }
    /*
     * This method loads the requested  platform database (ex: ae.json) for a production and
     * stores a copy in a member called ProductionData.plat_db.
     * @param {string} platform_id - The id of the platform being requested (ex. "ae", "c4d")
     */
    this.loadPlatformData = function ( platform_id ) {
        if (!this.platdata || this.name != this.plat_db["ESPN_META"]["production"]){
            var platJson = espnCore['prodJson'].format(this.name, platform_id);
            var platDb = getJson( platJson );
            this.platid = platform_id;
            this.plat_db  = platDb;
            this.platdata = true;
        }
    };
    /*
     * When the production changes, this method will reload the attached databases with the
     * correct JSON files.
     */
    this.reload = function(){
        if (this.teamdata) this.loadTeamData();
        if (this.showdata) this.loadShowData();
        if (this.platdata) this.loadPlatformData(this.platid);
    };
    /**
     * This is a helper method to access the platform database schema directly when needed.
     * It returns a copy of the platform database object, and you should familiarize yourself
     * with the JSON schema in order to make use of it.
     * @returns {Object} A copy of the platform JSON file (ex. ae.json)
     */
    this.getPlatformData = function () {
        if (!this.platdata) {
            this.loadPlatformData(this.platid);
        } return this.plat_db;
    };
    /**
     * This is a helper method to generate lists of teams based on arbitrary database categories.
     * Categories are other keys in the team's database, and values represent the needed filter.
     *
     *     var teams = getTeamsByCategory( 'CONFERENCE', 'ACC' );
     *     >> ['Florida State', 'North Carolina', ... ];
     *     
     *     var teams = getTeamsByCategory( 'TIER', '2' );
     *     >> ['Duke', 'Kentucky', 'Wichita St', .... ];
     *
     * @returns {Array} A list of team ids / names (which are always database keys)
     */   
    this.getTeamsByCategory = function (category, value) {
        if (!this.teamdata) this.loadTeamData();
        var result = [];
        for (t in this.teamlist) {
            var team = this.teamlist[t];
            try {
                if (this.teams[team][category] === value) {
                    result.push(team);
                }
            } catch (e) { continue; }
        }
        return result;
    };
    
    /* INITIALIZATION */
    /* Construction command -- load the production associated with the passed id key */
    this.load(id);
}
/**
 * TeamData is an object with built-in functions to load & validate team data from JSON
 * @constructor
 * @param {[String|ProductionData]} prodData - a Production id or ProductionData object
 * @param {string} id - A team's JSON key. Varies by production -- typically tricode.
 */
function TeamData ( prodData, id ) {
    (id === null) ? id = 'NULL' : null;
    // TeamData requires ProductionData because the ProductionData object stores the location
    // of the team database.
    // If a string is passed instead of ProductionData, turn it into ProductionData
    if (!prodData instanceof ProductionData){
        prodData = new ProductionData(prodData);
    }
    // ProductionData stores a copy of the entire teams.json (as an object member called 
    // ProductionData.teams). If that database hasn't been loaded yet, it gets loaded here.
    if (!prodData.teamdata) prodData.loadTeamData();

    // Use the copy of teams.json stored in ProductionData.teams to populate this object with
    // a specific team's information.
    this.id         = id;
    this.name       = id;
    this.dispName   = prodData.teams[id]['DISPLAY NAME'];
    this.nickname   = prodData.teams[id]['NICKNAME'];
    this.location   = prodData.teams[id]['LOCATION'];
    this.tricode    = prodData.teams[id]['TRI'];
    this.conference = prodData.teams[id]['CONFERENCE'];
    this.imsName    = prodData.teams[id]['IMS'];
    this.tier       = prodData.teams[id]['TIER'];
    this.primary    = "0x{0}".format(prodData.teams[id]['PRIMARY']);
    this.secondary  = "0x{0}".format(prodData.teams[id]['SECONDARY']);
}
/**
 * ShowData is an object with built-in functions to load & validate show data from JSON
 * @constructor
 * @param {[String|ProductionData]} prodData - a Production id or ProductionData object
 * @param {string} id - A show's JSON key. Varies by production -- typically tricode.
 */
function ShowData ( prodData, id ) {
    (id === null) ? id = 'NULL' : null;
    
    if (!prodData instanceof ProductionData){
        prodData = new ProductionData(prodData);
    }
    
    if (!prodData.showdata) prodData.loadShowData();
    
    this.id      = id;
    this.tricode = prodData.shows[id]["TRI"];
    this.name    = prodData.shows[id]["NAME"];
}
/**
 * SponsorData is an object with built-in functions to load & validate sponsor data from JSON
 * @constructor
 * @param {[String|ProductionData]} prodData - a Production id or ProductionData object
 * @param {string} id - A sponsor's JSON key. Varies by production -- typically a name.
 */
function SponsorData ( prodData, id ){
    (id === null) ? id = 'NULL' : null;
    
    if (!prodData instanceof ProductionData) {
        prodData = new ProductionData(prodData);
    }
    
    if (!prodData.sponsordata) prodData.loadSponsorData();
    
    this.id      = id;
    this.tricode = prodData.sponsors[id]["TRI"];
    this.name    = prodData.sponsors[id]["NAME"];
}

/*************************************************************************************************
 * PLATFORM INTEGRATION VIRTUAL OBJECTS
 * These are objects which assist in mapping database values and ops into destination platforms.
 * In many cases, these objects are meant to be extended by endpoint scripts and plugins.
 ************************************************************************************************/
illegalCharacters = /[.,`~!@#$%^&*()=+\[\]]/;
/**
 * A SceneData object stores filesystem and production metadata for an Adobe CC project file. It
 * primarily assists in validating status, synchronizing the active scene to the UI, and ensuring 
 * safe file handling, but could be extended in the future to integrate with other frameworks.
 * @constructor
 * @param {ProductionData} prodData - A ProductionData object with a valid (or null) production
 * @param {string} plat_id - The id of the platform to which the scene belongs
 */

function SceneData ( prodData, plat_id ) {
    // Production global variables 
    if (prodData instanceof ProductionData){
        this.prod = prodData;
    } else {
        this.prod = new ProductionData( prodData );
    }
    this.prod.loadPlatformData(plat_id);
    this.platform = plat_id;
    
    // Attach logging function
    this.log = new Log(this.platform);
    
    // Naming attributes
    // The project the scene belongs to
    this.project = "";
    // The description / specific name of the scene
    this.name = "";
    // The full name of the scene (project + name)
    this.fullName = "";
    // Current version of the scene
    this.version = 0;
    // Custom data attributes
    this.customA = "";
    this.customB = "";
    this.customC = "";
    this.customD = "";

    // Naming inclusion flags
    this.use_version = false;
    this.use_team0id = false;
    this.use_team1id = false;
    this.use_showid = false;
    this.use_sponsorid = false;
    this.use_customA = false;
    this.use_customB = false;
    this.use_customC = false;
    this.use_customD = false;
    
    // Versioning/production-context attributes
    // Init teamdata
    this.teams = new Array();
    this.teams[0] = new TeamData(this.prod, 'NULL');
    this.teams[1] = new TeamData(this.prod, 'NULL');
    // Init showdata
    this.show = new ShowData(this.prod, 'NULL');
    // Init sponsordata
    this.sponsor = new SponsorData(this.prod, 'NULL');

    // Set scene status to initialized state
    this.status = STATUS.UNDEFINED;
    
    /*
     * This method sets the attached ProductionData object based on the passed production id
     * and sets status flags indicating that the SceneData needs to be verified.
     * @param {string} prod - A production id key
     */
    this.setProduction = function ( prod ){
        if (this.prod.name !== prod){
            this.prod.load( prod );
            this.prod.loadPlatformData(this.platform);
            this.prod.loadTeamData();
            this.prod.loadShowData();
            this.version = 0;
        }
        if (!this.prod.is_live)
            this.status = STATUS.NO_DEST;
        else
            this.status = STATUS.CHECK_DEST;
    };
    /*
     * This method sets the project name on the SceneData object and sets a status flag
     * indicating that the SceneData needs to be verified.
     * @param {string} project_name - The name of a new or existing project
     */
    this.setProject = function ( project_name ) {
        if ((!project_name) || (illegalCharacters.test(project_name))){
            this.project = "";
        } else { 
            this.project = project_name;
            this.fullName = this.project + '_' + this.name;
            this.version = 0;
        }
        this.status = STATUS.CHECK_DEST;
    };
    /*
     * This method sets the scene name on the SceneData object and sets a status flag
     * indicating that the SceneData needs to be verified.
     * @param {string} name - A name for the scene
     */
    this.setName = function ( name ) {
        if ((!name) || (illegalCharacters.test(name))){
            this.name = "";
        } else { 
            this.name = name; 
            this.fullName = this.project + '_' + this.name;
            this.version = 0;
        }
        this.status = STATUS.CHECK_DEST;
    };
    /*
     * This method will load a new TeamData object into the SceneData.teams array at the
     * passed index location. (By convention, 0 is the home team and 1 is the away team.)
     * @param {number} loc - The index of the team to be changed
     * @param {string} teamid - The id of the team to be loaded
     */
    this.setTeam = function ( loc, teamid ) {
        var team = new TeamData( this.prod, teamid );
        if (team !== undefined){
            this.teams[loc] = team;
        }
        if (this.status >= STATUS.UNSAVED)
            this.status = STATUS.UNSAVED;
    };
    /*
     * This method will set the current showid attached to the SceneData object.
     * @param {string} showid - A show id string
     */
    this.setShow = function ( showid ) {
        if (showid !== undefined){
            this.show = new ShowData( this.prod, showid );
        }
        if (this.status >= STATUS.UNSAVED)
            this.status = STATUS.UNSAVED;
    };
    /*
     * This method will set the current sponsorid attached to the SceneData object.
     * @param {string} sponsorid - A sponsor id string
     */
    this.setSponsor = function ( sponsorid ) {
        if (sponsorid !== undefined){
            this.sponsor = new SponsorData( this.prod, sponsorid );
        } 
        if (this.status >= STATUS.UNSAVED)
            this.status = STATUS.UNSAVED;
    };
    /*
     * This method will recursively search the backup folder of the current SceneData
     * object and determine the next available increment. This increment (number) becomes
     * the "version" of the scene.
     */
    this.setVersion = function () {
        var f = new File( this.getFullPath()['backup'] );
        if (!f.exists) {
            return true;
        } else if (f.exists) {
            this.version += 1;
            this.setVersion();
        }
    };
    /*
     * This method will set the requested custom text member of the SceneData object. Currently
     * there are four custom text members, identified as A-D.
     * @param {string} id - The custom text member to modify ('A' thru 'D')
     * @param {string} custom_data - The new data for the custom text member to hold
     */
    this.setCustom = function ( id, custom_data ) {
        this['custom{0}'.format(id)] = custom_data;
        this.version = 0;
        if (this.status >= STATUS.UNSAVED)
            this.status = STATUS.UNSAVED;
    };
    /*
     * This method will set the boolean flags used to include various SceneData values in the
     * scene's file name and render output..
     * @param {bool} t - Use the team0 id
     * @param {bool} s - Use the show id
     * @param {bool} a - Use the customA text data
     * @param {bool} b - Use the customB text data
     * @param {bool} c - Use the customC text data
     * @param {bool} d - Use the customD text data
     */
    this.setNameFlags = function ( t, s, a, b, c, d ){
        // TODO -- THIS IS MISSING AWAY TEAM AND SPONSOR ID (LIKE THE UI)
        this.use_team0id = t;
        this.use_showid  = s;
        this.use_customA = a;
        this.use_customB = b;
        this.use_customC = c;
        this.use_customD = d;
        this.version = 0;
        if (this.status >= STATUS.UNSAVED)
            this.status = STATUS.UNSAVED;
    }
    /**
      * This method populates the SceneData object with JSON data generated by the getTag() method.
      * Think of it as the inverse of the getTag() method. It is used to generate SceneData objects 
      * from existing metadata / project files.
      * @param {string} tag_string - A JSON string with all necessary keys
      */
    this.setFromTag = function ( tag_string ) {
        var data = JSON.parse(tag_string);
        if (data['prod'] !== this.prod.name || data['plat'] !== this.platform){
             this.setProduction(data['prod'], data['plat']);
        }
        if (data['project'] !== this.project){
            this.setProject(data['project']);
        }
        try {
            this.setName(data['scene']);
            this.setVersion(data['version']);
            this.setShow(data['show'][0]);
            //this.setSponsor(data['sponsor'][0]);
            this.setCustom('A', data['customA'][0]);
            this.setCustom('B', data['customB'][0]);
            this.setCustom('C', data['customC'][0]);
            this.setCustom('D', data['customD'][0]);
            this.setTeam(0, data['team0'][0]);
            this.setTeam(1, data['team1'][0]);
            this.use_team0id = data['team0'][1];
            this.use_team1id = data['team1'][1];
            this.use_showid = data['show'][1];
            this.use_sponsorid = data['sponsor'][1];
            this.use_customA = data['customA'][1];
            this.use_customB = data['customB'][1];
            this.use_customC = data['customC'][1];
            this.use_customD = data['customD'][1];
            this.status = STATUS.CHECK_DEST;            
        } catch (e) { alert(e.message) }

    };
    /**
      * This method retrieves the server location for this SceneData's project file and its backup.
      * It is platform dependent, and includes a lookup to the production's master database for
      * the correct save location for that platform. It does not validate the location or ensure
      * that it can be written to -- it only generates the string.
      * @returns {Object} 
      *     ['primary'] {string} The main save folder 
      *     ['backup']  {string} The backup folder
      */
    this.getFullPath = function () {
        var output = {
            'primary': this.getFolder('{0}_project') + '/' + this.getName(),
            'backup' : this.getFolder('{0}_backup') + '/' + this.getName(true)
        };
        return output;
    };
    /** 
      * This method constructs a file name for the project file associated with this SceneData.
      * The SceneData.use_* members are boolean flags that will include certain SceneData in the
      * generated filename. If these flags are true, the associated data will be parsed by this
      * function and included in the filename with leading underscores. This same methodology
      * is used in getRenderName()
      * @param {bool} vers - (Optional) Include the version number (ex: filename.0001.ext)
      * @param {string} ext - (Optional) Specify the extension. (Default is based on platform.)
      * returns {string} A filename (NOT a File object)
      */
    this.getName = function ( vers, ext ) {
        // The root of every scene name is the project it belongs to
        var fileName = this.project;
        // Parse optional tag and add it to the name 
        if (this.name !== "")
            fileName = "{0}_{1}".format(fileName, this.name);
        // Parse additional optional file name inclusions
        // version tag
        var vtag = "";
        /// include the version with the file name (in the case of backups)
        if (vers === true)
            vtag = ".{0}".format( zeroFill(this.version, 4) );
        else
            vtag = "";
        // include tricodes, show ids, sponsor ids, custom text, etc
        // namingOrder sets the order in which they are included in the filename
        var inclusions = "";
        var namingOrder = [
            [this.use_team0id, this.teams[0].tricode],
            [this.use_team1id, this.teams[1].tricode],
            [this.use_showid, this.show.id],
            [this.use_sponsorid, this.sponsor.tricode],
            [this.use_customA, this.customA],
            [this.use_customB, this.customB],
            [this.use_customC, this.customC],
            [this.use_customD, this.customD]
        ];
        // Loop over the naming order array. If the inclusion flag is true, include the associated
        // string value in the file name. (ex: if this.use_team0id is true, include 
        // this.teams[0].tricode in the file name.)
        for (i in namingOrder){
            if (!namingOrder.hasOwnProperty(i)) continue;
            if (namingOrder[i][0] === true){
                if (namingOrder[i][1] === "NULL" ||
                    namingOrder[i][1] === "NUL" ||
                    namingOrder[i][1] === "" || 
                    namingOrder[i][1] === null){
                    // If the user tries to include bad data, just skip it and log a warning about it
                    this.log.write(2, "An included naming field was empty: {0}".format(namingOrder[i][0].toSource()));
                    continue;
                }                
                else {
                    // The .split().join() step replaces the spaces with underscores
                    inclusions += "_{0}".format(namingOrder[i][1]).split(' ').join('_');
                }
            }
        }
        // file extension
        var extensionLookup = {
            'ae': 'aep',
            'ai': 'ai',
            'ps': 'psd'
        };
        if (ext === undefined)
            ext = extensionLookup[this.platform];      
        // generate & return final file name
        return ("{0}{1}{2}.{3}".format(fileName, inclusions, vtag, ext));
    }; 
    /**
      * This function generates a file name for any renders created by this SceneData.
      * @param {string} tag - A prefix for the file name (usually a comp name or something
      *     defined by the artist ahead of time.)
      * @param {string} ext - The file extension for the render ("mov", "png", etc)
      * @returns {string} A formatted filename with inclusions (for detail on inclusions, see
      *     getName().)
      */
    this.getRenderName = function ( tag, ext ){
        //var name = tag;
        var inclusions = "";
        var namingOrder = [
            [this.use_team0id, this.teams[0].tricode],
            [this.use_team1id, this.teams[1].tricode],
            [this.use_showid, this.show.id],
            [this.use_sponsorid, this.sponsor],
            [this.use_customA, this.customA],
            [this.use_customB, this.customB],
            [this.use_customC, this.customC],
            [this.use_customD, this.customD]
        ];
        for (i in namingOrder){
            if (!namingOrder.hasOwnProperty(i)) continue;
            if (namingOrder[i][0] === true){
                if (namingOrder[i][1] === "NULL" || namingOrder[i][1] === "NUL" || namingOrder[i][1] === "" || namingOrder[i][1] === null){
                    //this.status = STATUS.UNDEFINED;
                    continue;
                    //return false;
                }                
                else {
                    inclusions += "_{0}".format(namingOrder[i][1]).split(' ').join('_');
                }
            }
        }
        return ("{0}{1}.{2}".format(tag, inclusions, ext));
    }
    /**
      * This function takes the values of this SceneData object and converts them into JSON.
      * The resulting JSON string can be used to reconstruct the SceneData object at a later
      * time. This is useful for storing SceneData as a tag in scene files, or to transmit
      * SceneData to another artist.
      * @returns {Object} A JSON object representing this SceneData
      */
    this.getTag = function () {
        var tagData = {
            'plat'   :  this.platform,
            'prod'   :  this.prod.name,
            'project':  this.project,
            'scene'  :  this.name,
            'version':  this.version,
            'show'   : (this.show !== "") ? [this.show.id, this.use_showid] : ['NULL', false],
            'sponsor': (this.sponsor !== "") ? [this.sponsor, this.use_sponsorid] : ['NULL', false],
            'customA': [this.customA, this.use_customA],
            'customB': [this.customB, this.use_customB],
            'customC': [this.customC, this.use_customC],
            'customD': [this.customD, this.use_customD],
            'team0'  : (this.teams[0]) ? [this.teams[0].id, this.use_team0id] : ['NULL', false],
            'team1'  : (this.teams[1]) ? [this.teams[1].id, this.use_team1id] : ['NULL', false]          
        };
        try {
            tagData = JSON.stringify(tagData);
        } catch(e){
            alert(e.message);
        }
        return(tagData);/**/
    }
    /**
      * This function searches a production's folder (as in on the server) template looking
      * for the requested key.
      */
    this.getFolder = function ( lookup ) {
        (lookup === undefined) ? lookup = '{0}_project' : null;
        
        if ($.os.indexOf('Windows') > -1)
            var root = this.prod.root;
        else if ($.os.indexOf('Macintosh') > -1)
            var root = this.prod.root.replace('Y:', '/Volumes/cagenas')
            
        var fold = this.prod.folders[lookup.format(this.platform)];
        
        return (root + fold).format(this.project);
    };
    /**
      * This function searches the platform project template data recursively, looking for the
      * requested key. When found, it presents the child JSON data of that key. This is useful
      * for nested JSON objects of unknown depth -- such as in a project heirarchy.
      * ex: scene.templateLookup('dashboard') --> ["0. Dashboard", CompItem, {?JSONDATA}]
      * @param {(string|number)} lookup - The key to search for (it's assumed to be unique)
      * @returns {Object} The child data of the requested key (if found, otherwise undefined)
      */
    this.templateLookup = function ( lookup ) {
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
        var platformData = this.prod.getPlatformData()['Template'];
        return search(platformData, lookup);
     };
    /** This function ensures that the virtual object is correctly populated and does not
      * contain NULL data in any of its filesystem critical attributes. It should be run
      * and the SceneData.status checked before any disk writes or buffered scene handoffs.
      * @param {String} tagString - A single-line metadata tag
      * @returns {Int} A status flag (see STATUS object)
      */
    this.prevalidate = function () {
        // Check all critical naming attributes for bad data -- if any is found, the scene
        // is invalid (UNDEFINED)
        if (this.plat === "NULL" || this.plat === "" || this.plat === null){
            this.status = STATUS.UNDEFINED;
        }
        if (this.prod === "NULL" || this.prod === "" || this.prod === null){
            this.status = STATUS.UNDEFINED;
        }
        if (this.project === "NULL" || this.project === "" || this.project === null){
            this.status = STATUS.UNDEFINED;
        }
        // If another function has set this scene to CHECK_DEST (meaning the file name has
        // changed, and it must be validated) -- generate new file paths and ensure that
        // they exist.
        if (this.status === STATUS.CHECK_DEST){
            var outputPath = new File( this.getFolder('{0}_project') );
            var outputFile = new File( this.getFullPath()['primary'] );
            
            if (!outputPath.exists){
                // NO_DEST means that the scene has no writeable destination folder
                this.status = STATUS.NO_DEST;
            }
            else if (outputFile.exists){
                // OK_WARN means that the location exists, but so does a file with the same name
                this.status = STATUS.OK_WARN;
                this.setVersion();
            }
            else {
                // OK means that the scene is safe to write and will not overwrite anything
                this.status = STATUS.OK;
                this.setVersion();
            }
        }
        // If another function has set the scene to UNSAVED, it just means something minor has
        // changed and it's no big deal. At the moment this doesn't really do anything.
        if (this.status === STATUS.UNSAVED){
            this.status = STATUS.OK;
            this.setVersion();
        }
    };
    /** This is a placeholder for the eventuality that Adobe will realize file save verification
      * is a fairly important feature.
      */
    this.postvalidate = function () {};
    
    this.dump = function () {
        var outstr = "";
        outstr += '\nPlatform: ' + this.platform;
        outstr += '\nProject : ' + this.fullName;
        outstr += '\nVersion : ' + this.version;
        outstr += '\nTeam 0  : ' + this.teams[0].id;
        outstr += '\nTeam 1  : ' + this.teams[1].id;
        outstr += '\nShow    : ' + this.show.id;
        outstr += '\nStatus  : ' + this.status;
        alert(outstr);
    }
}

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

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
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
