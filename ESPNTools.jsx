/**
 * ESPNTools
 * @summary A suite of templating, toolkitting and automation tools for ESPN's AfterEffects
 * graphics and animation pipeline.
 *
 * @version 1.0.3
 * @author mark.rohrer@espn.com
 * @date 12/15/2017
 *
 */

#target aftereffects

$.evalFile(((new File($.fileName)).parent).toString() + '/lib/aeCore.jsx');
$.evalFile(((new File($.fileName)).parent).toString() + '/lib/aeTemplate.jsx');
$.evalFile(((new File($.fileName)).parent).toString() + '/lib/espnCore.jsx');

/*********************************************************************************************
 * ESPNTools
 * Self-executing ScriptUI panel integrating espnCore.jsx metadata objects into AfterEffects
 ********************************************************************************************/ 
(function ESPNTools(thisObj)
{	
    // liveScene is a SceneData object that is always a writeable location on cagenas. It 
    // maps scene metadata for an AfterEffects project into the database.
    var liveScene;
    // tempScene is a SceneData object used as a buffer to verify user input and changes to
    // the active AfterEffects project.
    var tempScene;

    // the number of custom assets to search for when switching
    var NUM_CUSTOM_ASSETS = 5;
    
    // Locations for render .bat files
    var RENDER_BAT_FILE = new File("~/aeRenderList.bat");
    var EDIT_BAT_FILE   = new File("~/editRenderList.bat");
    var ERR  = 0;
    var WARN = 1;
    var INFO = 2;

    // Error messages for common issues
    var errorMessages = {
        'missing_dashboard' : 'Could not find the dashboard in your scene. Run Build Template to repair it.',
        'missing_template'  : 'Could not find one or more critical template pieces in your scene. Run Build Template to repair it.',
        'missing_textlayers': 'Could not modify one or more text layers in your dashboard. Run Build Template to repair it',
        'invalid_save_loc'  : 'This scene\'s save location is not valid.',
        'invalid_scenedata' : 'There is a problem validating SceneData. Check your entries and try again. Status: {0}',
        'failed_tagging'    : 'SceneData could not be pushed to the dashboard tag.',
        'failed_eval'       : 'Could not eval the custom script assigned to this switching operation',
        'failed_save'       : 'Your scene could not be saved! You may want to manually save a temporary backup to your local drive.',
        'failed_backup'     : 'Could not save backup for this scene. Check the log for details.',
        'failed_build'      : 'There was an error building part of your project template. Check the log for details.',
        'failed_queue'      : 'There was a problem adding items to your render queue. Check the log for details.',
        'failed_wipque'     : 'There was a problem building WIP comps to add to your queue. Check the log for details.'
    };
    
    /*********************************************************************************************
     * INITIALIZERS
     * These functions set the initial state of the UI under various conditions.
     ********************************************************************************************/  
    /*
     * This function is a setup init that checks the current scene and redirects to an appropriate
     * initializer for that scene's current state.
     */
    function initialize () {
        // Create a new SceneData object with no production loaded ('NULL')
        liveScene = new SceneData('NULL','ae');
        // And save a duplicate as tempScene
        tempScene = liveScene;
        // Attempt to scan the scene for a pipeline tag and verify it using tempScene
        try {
            var tagString = getItem('0. Dashboard').comment;
            tempScene.setFromTag(tagString);
            // prevalidate sets the status 
            tempScene.prevalidate();
        } catch(e) {
            // If there is no dashboard tag, it's not a pipeline scene
            tempScene.status = STATUS.UNDEFINED;
        }
        
        // If the scene passes validation, copy the tempScene to the liveScene and load it into the UI
        if ( tempScene.status === STATUS.OK ||
             tempScene.status === STATUS.OK_WARN ){
            // This scene has valid data and is ready to go. Update the UI with its info
            // Set the buffered scene to live
            liveScene = tempScene;
            // Populate the UI with the active data
            initializeFromLiveScene();
            initializeLinkToScene();
            liveScene.log.write(INFO, 'Loaded {0}'.format(liveScene.project));
        // If the scene has a valid pipeline tag, but the server location isn't there for some reason
        } else if (tempScene.status === STATUS.NO_DEST) {
            liveScene = tempScene;
            var msg = "This scene has moved and its save location is no longer valid. Please re-save immediately.";
            liveScene.log.write(WARN, msg);
            // Warn the user but load it anyway
            initializeFromLiveScene();
            initializeLinkToScene();
        }
        // There is no pipeline tag, so treat it as a new project file
        else {
            initializeNewProject();
        }
    }
    /*
     * When the scene is already in the pipeline, this updates the UI with the metadata from the
     * current liveScene object.
     */
    function initializeFromLiveScene () {
        populateProductionsDropdown();
        setProductionMenu(liveScene.prod.name);
        
        populateProjectsDropdown();
        setProjectMenu(liveScene.project);
        setNameMenu(liveScene.name); 
        
        populateTeamsDropdown();
        setHomeTeamMenu(liveScene.teams[0].id);
        setAwayTeamMenu(liveScene.teams[1].id);
        
        populateExpressionsDropdown();
        
        populateShowsDropdown();
        setShowMenu(liveScene.show.id);
        
        //populateSponsors();
        //setSponsorMenu(liveScene.sponsor);
        
        setCustomTextMenu(
            liveScene.customA,
            liveScene.customB,
            liveScene.customC,
            liveScene.customD
        );
        setNamingFlagsCheckboxes(
            [liveScene.use_tricode,
             liveScene.use_show,
             liveScene.use_customA,
             liveScene.use_customB,
             liveScene.use_customC,
             liveScene.use_customD]
        );
        setScriptFields();
    }
    /*
     * When a scene is loaded that's not in the pipeline, the only thing populated in the UI is
     * the production selection dropdown. The rest of the information is cleared.
     */    
    function initializeNewProject () {
        setEmptyMenus();
        populateProductionsDropdown();
    }

    /*********************************************************************************************
     * POPULATE FUNCTIONS FOR UI DROPDOWNS
     * These functions are used to populate dropdowns and fields when called
     ********************************************************************************************/
    /*
     * Adds productions to the dropdown menu
     */  
    function populateProductionsDropdown () {
        var element = dlg.grp.tabs.setup.production.dd;
        element.removeAll();
        element.add("item", undefined);
        var prodList = getActiveProductions();
        for (i in prodList){
            if (!prodList.hasOwnProperty(i)) continue;
            element.add("item", prodList[i]);
        } 
    }
    /*
     * Adds this production's projects to the dropdown menu
     * @param {boolean} useTempScene - Set this to true to load projects from the tempScene instead.
     * (This flag is only used when the user changes the production in the UI.)
     */  
    function populateProjectsDropdown (useTempScene) {
        var element = dlg.grp.tabs.setup.projectName.pick.dd;
        element.removeAll();
        if (!useTempScene || useTempScene === undefined) {
            var projList = getAllProjects(liveScene.prod.name);
        } else {
            var projList = getAllProjects(tempScene.prod.name);
        }
        for (i in projList){
            if (!projList.hasOwnProperty(i)) continue;
            element.add("item", projList[i]);
        }
    }
    /*
     * Adds this production's teams to the home team dropdown menu
     */  
    function populateTeamsDropdown (useTempScene) {
        var home = dlg.grp.tabs.version.div.fields.team.dd;
        var away = dlg.grp.tabs.version.div.fields.away.dd;
        
        home.removeAll();        
        away.removeAll();
        
        if (!useTempScene || useTempScene === undefined){
            liveScene.prod.loadTeamData();
            for (i in liveScene.prod.teamlist){
                if (!liveScene.prod.teamlist.hasOwnProperty(i)) continue;
                home.add("item", liveScene.prod.teamlist[i]);
                away.add("item", liveScene.prod.teamlist[i]);
            }
        } else {
            tempScene.prod.loadTeamData();
            for (i in tempScene.prod.teamlist){
                if (!tempScene.prod.teamlist.hasOwnProperty(i)) continue;
                home.add("item", tempScene.prod.teamlist[i]);
                away.add("item", tempScene.prod.teamlist[i]);
            }
        }
    }
    /*
     * Adds this production's shows to the dropdown menu
     */  
    function populateShowsDropdown (useTempScene) {
        var shows = dlg.grp.tabs.version.div.fields.shows.dd;
        
        shows.removeAll();
        
        if (!useTempScene || useTempScene === undefined){
            liveScene.prod.loadShowData();
            for (i in liveScene.prod.showlist){
                if (!liveScene.prod.showlist.hasOwnProperty(i)) continue;
                shows.add("item", liveScene.prod.showlist[i]);
            }
        } else {
            tempScene.prod.loadShowData();
            for (i in tempScene.prod.showlist){
                if (!tempScene.prod.showlist.hasOwnProperty(i)) continue;
                shows.add("item", tempScene.prod.showlist[i]);
            }
        }
    }
    /*
     * Adds this production's sponsors to the dropdown menu
     */ 
    function populateSponsorsDropdown () {}
    /*
     * Adds this production's expressions presets to the dropdown menu
     */
    function populateExpressionsDropdown () {
        var menu = dlg.grp.tabs.toolkit.expPick;
        var exps = liveScene.prod.getPlatformData()["Expressions"];
        var list = [];
        menu.removeAll();
        for (k in exps){
            if (!exps.hasOwnProperty(k)) continue;
            list.push(k);
        }
        list = list.sort();
        for (i in list){
            if (!list.hasOwnProperty(i)) continue;
            menu.add("item", list[i]);
        }
    }
    
    /*********************************************************************************************
     * SETTERS FOR UI FIELDS
     * These functions set the values of fields and dropdowns based on whatever is in the
     * liveScene object
     ********************************************************************************************/
    /*
     * Clears all the menus (dropdowns, text fields, and checkboxes) *except* for the production
     * dropdown list -- since that doesn't change very often.
     */
    function setEmptyMenus () {
        // dropdowns
        //dlg.grp.tabs.setup.production.dd.removeAll();
        dlg.grp.tabs.setup.projectName.pick.dd.removeAll();
        dlg.grp.tabs.version.div.fields.team.dd.removeAll();
        dlg.grp.tabs.version.div.fields.away.dd.removeAll();
        dlg.grp.tabs.version.div.fields.shows.dd.removeAll();
        // +sponsors
        // text fields
        dlg.grp.tabs.setup.sceneName.e.text = "";
        dlg.grp.tabs.version.div.fields.customA.et.text = "";
        dlg.grp.tabs.version.div.fields.customB.et.text = "";
        dlg.grp.tabs.version.div.fields.customC.et.text = "";
        dlg.grp.tabs.version.div.fields.customD.et.text = "";
        // set useExisting initial state
        dlg.grp.tabs.setup.useExisting.cb.value = true;
        dlg.grp.tabs.setup.projectName.pick.visible = true;
        dlg.grp.tabs.setup.projectName.edit.visible = false;
        // turn off naming inclusion checkboxes
        dlg.grp.tabs.version.div.checks.cbT.value = false;
        dlg.grp.tabs.version.div.checks.cbS.value = false;
        dlg.grp.tabs.version.div.checks.cbA.value = false;
        dlg.grp.tabs.version.div.checks.cbB.value = false;
        dlg.grp.tabs.version.div.checks.cbC.value = false;
        dlg.grp.tabs.version.div.checks.cbD.value = false;        
    }
    /*
     * Sets the production dropdown to the passed production id
     * @param {string} prod - The production's id key
     */
    function setProductionMenu ( prod ){
        var prodList = getActiveProductions();
        var i = prodList.indexOf(prod);
        if (i === -1){
            //TODO -- ERROR -- COULD NOT SET PRODUCTION DROPDOWN
            dlg.grp.tabs.setup.production.dd.selection = 0;
        } else {
            // +1 because i added an empty spot at 0
            dlg.grp.tabs.setup.production.dd.selection = i+1;
        }
    }
    /*
     * Sets the project dropdown to the passed project name
     * @param {string} proj - The project name
     */    
    function setProjectMenu ( proj ){
        var i = getAllProjects(liveScene.prod.name).indexOf(proj);
        if (i === -1){
            //TODO -- ERROR
        } else {
            dlg.grp.tabs.setup.projectName.pick.dd.selection = i;
        }
    }
    /*
     * Sets the scene name text field to the passed name
     * @param {string} name - The scene name
     */      
    function setNameMenu ( name ) {
        if (name !== undefined);
        dlg.grp.tabs.setup.sceneName.e.text = name;
    }
    /*
     * Sets the home team dropdown field to the passed team key id
     * @param {string} team - The team id requested
     */    
    function setHomeTeamMenu ( team ){
        var i = liveScene.prod.teamlist.indexOf(team);
        if ( i === -1){
        } else {
            dlg.grp.tabs.version.div.fields.team.dd.selection = i;
        }
    }
    /*
     * Sets the away team dropdown field to the passed team key id
     * @param {string} team - The team id requested
     */    
    function setAwayTeamMenu ( team ){
        var i = liveScene.prod.teamlist.indexOf(team);
        if ( i === -1){
        } else {
            dlg.grp.tabs.version.div.fields.away.dd.selection = i;
        }
    }
    /*
     * TODO: COMMENTS
     */
    function setShowMenu ( show ){
        var i = liveScene.prod.showlist.indexOf(show);
        if ( i === -1 ){
        } else {
            dlg.grp.tabs.version.div.fields.shows.dd.selection = i;
        }
    }
    /*
     * Sets the custom text fields in the UI
     * @param {string} a,b,c,d - Strings for custom text fields A thru D (all 4 required in order)
     */    
    function setCustomTextMenu (a,b,c,d) {
        dlg.grp.tabs.version.div.fields.customA.et.text = a;
        dlg.grp.tabs.version.div.fields.customB.et.text = b;
        dlg.grp.tabs.version.div.fields.customC.et.text = c;
        dlg.grp.tabs.version.div.fields.customD.et.text = d;
    }
    /*
     * Sets the naming flag checkboxes (the ones in the versioning tab)
     * @param {(Array(bool) || bool), [idx]} values - The boolean values of the checkboxes in order
     */
    function setNamingFlagsCheckboxes ( values ) {
        var namingFlagsGrp = dlg.grp.tabs.version.div.checks;
        try {
            namingFlagsGrp.cbT.value = values[0];
            namingFlagsGrp.cbS.value = values[1];
            namingFlagsGrp.cbA.value = values[2];
            namingFlagsGrp.cbB.value = values[3];
            namingFlagsGrp.cbC.value = values[4];
            namingFlagsGrp.cbD.value = values[5];  
        } catch (e) {
            var m = 'Could not set naming flags checkboxes.\nvalue passed: {0}\nidx passed: {1}'.format(values, idx);
            alert (m);
        }
    };
    /*
     * Sets the custom script fields in the UI from the comment tags holding it. Unlike other
     * functions in this category, it does not pull from the liveScene, but rather from the 
     * project itself.
     */
    function setScriptFields () {
        var lookup = {
            'team' : dlg.grp.tabs.toolkit.teamScript.et,
            'away' : dlg.grp.tabs.toolkit.awayScript.et,
            'show' : dlg.grp.tabs.toolkit.showScript.et,
            'cust' : dlg.grp.tabs.toolkit.custScript.et
        };
        for (k in lookup) {
            if (!lookup.hasOwnProperty(k)) continue;
            
            var comp = liveScene.templateLookup('{0}Script'.format(k));
            comp = getItem(comp);
            
            var script = comp.comment.toString();
            
            lookup[k].text = script;
        }
    }
    
    /*********************************************************************************************
     * THINGS-HAVE-CHANGED (IN THE UI) FUNCTIONS
     * These functions are called whenever the user updates something in the UI. In the case of
     * changedProduction and changedProject (which have major disk implications) the tempScene
     * object is changed, and must be validated before passing to the liveScene. In the case of
     * teams, custom text, etc -- the liveScene object is directly modified.
     ********************************************************************************************/
    /*
     * Changing the production is a big deal. The UI is cleared and this is the only time the 
     * project list loads from the tempScene instead of the liveScene.
     */ 
    function changedProduction () {
        var prod_id = dlg.grp.tabs.setup.production.dd.selection;
        tempScene.setProduction(prod_id.toString());
        setEmptyMenus();
        populateProjectsDropdown(true);
        populateTeamsDropdown(true);
        populateShowsDropdown(true);
        //populateSponsorsDropdown();
        populateExpressionsDropdown();
    }
    /*
     * This function both updates the tempScene when the project name is changed AND changes the 
     * visibility of the project selection fields (swaps the dropdown and the text box) when the 
     * "Use Existing" checkbox is clicked.
     */
    function changedProject (strict) {
        strict = (strict === undefined) ? true : false;
        var useExisting = dlg.grp.tabs.setup.useExisting.cb.value;
        
        var projectDropdown = dlg.grp.tabs.setup.projectName.pick;
        var projectEditText = dlg.grp.tabs.setup.projectName.edit;
        
        if (useExisting){
            projectDropdown.visible = true;
            projectEditText.visible = false;
            
            tempScene.setProject(projectDropdown.dd.selection.toString());
            
        } else {
            projectDropdown.visible = false;
            projectEditText.visible = true;
            
            var projectText = projectEditText.e.text;
            projectEditText.e.text = projectText.split(' ').join('_');
            
            tempScene.setProject(projectEditText.e.text);
            // setProject() sets the value to "" in the event of illegal characters
            if (tempScene.project === "" && strict === true) {
                tempScene.log.write(ERR, errorMessages['invalid_scenedata'].format(tempScene.status));
            }
        }
    }
    /*
     * Updates the tempScene.name data when the text field is changed
     */    
    function changedProjectName () {
        var nameText = dlg.grp.tabs.setup.sceneName.e.text;
        dlg.grp.tabs.setup.sceneName.e.text = nameText.split(' ').join('_');
        
        tempScene.setName(nameText);
        // setName() sets the value to "" in the event of illegal characters
        if (tempScene.name === "") {
            tempScene.log.write(ERR, errorMessages['invalid_scenedata'].format(tempScene.status));
        }
    }
    /*
     * Updates the all tempScene custom text data when the text fields are changed
     */     
    function changedCustomText () {
        var textA = dlg.grp.tabs.version.div.fields.customA.et.text;
        var textB = dlg.grp.tabs.version.div.fields.customB.et.text;
        var textC = dlg.grp.tabs.version.div.fields.customC.et.text;
        var textD = dlg.grp.tabs.version.div.fields.customD.et.text;
        
        liveScene.setCustom('A', textA);
        liveScene.setCustom('B', textB);
        liveScene.setCustom('C', textC);
        liveScene.setCustom('D', textD);
        
        switchCustomText();
        evalUserScripts('cust');
    }
    /*
     * Updates the tempScene.teams[0] data when the dropdown is changed
     */      
    function changedHomeTeam () {
        var teamid = dlg.grp.tabs.version.div.fields.team.dd.selection;
        if (teamid.toString() === liveScene.teams[0].name) return null;
        
        liveScene.setTeam(0, teamid.toString());
        
        switchLogosheet('team');
        switchDashboardTextLayers('team');
        switchCustomAssets('team');
        evalUserScripts('team');
    }
    /*
     * Updates the tempScene.teams[0] data when the dropdown is changed
     */   
    function changedAwayTeam () {
        var teamid = dlg.grp.tabs.version.div.fields.away.dd.selection;
        if (teamid.toString() === liveScene.teams[1].name) return null;
        
        liveScene.setTeam(1, teamid.toString());
        
        switchLogosheet('away');
        switchDashboardTextLayers('away');
        switchCustomAssets('away');
        evalUserScripts('away');
    }
    /*
     * Updates the tempScene.show data when the dropdown is changed
     */      
    function changedShow () {
        var showid = dlg.grp.tabs.version.div.fields.shows.dd.selection;
        if (showid.toString() === liveScene.show.id) return null;
        
        liveScene.setShow(showid.toString());
        
        switchLogosheet('show');
        switchDashboardTextLayers('show');
        switchCustomAssets('show');
        evaluserScripts('show');
    }
    /*
     * Updates the tempScene.sponsor data when the dropdown is changed
     */        
    function changedSponsor () {}
    /*
     * Updates the tempScene file naming inclusion data when the checkboxes are changed
     */  
    function changedNamingFlags () {
        var namingFlagsGrp = dlg.grp.tabs.version.div.checks;
        
        var useTricode = namingFlagsGrp.cbT.value;
        var useShowid  = namingFlagsGrp.cbS.value;
        var useCustomA = namingFlagsGrp.cbA.value;
        var useCustomB = namingFlagsGrp.cbB.value;
        var useCustomC = namingFlagsGrp.cbC.value;
        var useCustomD = namingFlagsGrp.cbD.value;
        
        liveScene.setNameFlags( useTricode,
                                useShowid,
                                useCustomA,
                                useCustomB,
                                useCustomC,
                                useCustomD  );
        switchDashboardTag();
    }
    /*
     * Updates the ScriptHolder comment tag whenever the onChange script fields are modified
     */
    function changedScript (flag) {
        if (!flag) return false;
        var lookup = {
            'team' : dlg.grp.tabs.toolkit.teamScript.et,
            'away' : dlg.grp.tabs.toolkit.awayScript.et,
            'show' : dlg.grp.tabs.toolkit.showScript.et,
            'cust' : dlg.grp.tabs.toolkit.custScript.et
        };
        var input = lookup[flag].text;
        var comp = liveScene.templateLookup('{0}Script'.format(flag));
        comp = getItem(comp);
        if (!comp) {
            alert('Couldn\'t find script holder comp');
            //TODO -- ERROR
            return false;
        } else {
            comp.comment = input.toString();
        }
    }
    /*********************************************************************************************
     * VALIDATION / FOLDER CREATION / FILE SAVING
     * These functions will validate the tempScene object, allow the tempScene to be pushed live,
     * set the scene tag on the project file, create project folders (if necessary) and save the 
     * project file.
     ********************************************************************************************/
    /*
     * This function is called to test the user's input and attempt to push the tempScene into
     * the liveScene. If this is successful, the scene is tagged and ready to be written to the
     * server (or run switching and automation commands.)
     * @returns {bool}
     */
    function pushTempToLive () {
        tempScene.prevalidate();
        if ( tempScene.status === (STATUS.NO_DEST) ){
            // create a destination folder for the scene
            // .. confirm with user
            var msg = "This project does not exist. Do you want to create a new project in {0}?".format(tempScene.prod.name);
            if (!Window.confirm(msg)) return false;
            // .. then do it
            tempScene.log.write(INFO, 'Creating new project!');
            createProject(tempScene);
            // override the status to force another check
            tempScene.status = STATUS.CHECK_DEST;
            // .. and confirm that the location now exists
            tempScene.prevalidate();
        } 
        var success;
        if ( tempScene.status === STATUS.OK ||
             tempScene.status === STATUS.OK_WARN ||
             tempScene.status === STATUS.UNSAVED ) {
            
            liveScene = tempScene;
            success = switchDashboardTag();

        } else {
            tempScene.log.write(ERR, errorMessages['invalid_scenedata'].format(tempScene.status));
            success = false;
        }
        return success;
    }
    /*
     * When the liveScene is ready to be synchronized to AfterEffects and saved to the network,
     * this function pushes the tempScene to the liveScene, verifies that the handoff was successful,
     * prompts the user for overwrite confirmation (if necessary). Once that's done, it saves the
     * file (and its backup) to the network. 
     */
    function saveWithBackup (ignore_warning) {
        (!ignore_warning) ? ignore_warning = false : ignore_warning = true;
        
        var sync = pushTempToLive();
        if (!sync || 
            liveScene.status === STATUS.NO_DEST || 
            liveScene.status === STATUS.CHECK_DEST || 
            liveScene.status === STATUS.UNDEFINED) {
            
            liveScene.log.write(ERR, errorMessages['invalid_scenedata']);
            return false;
        }
        // STATUS.OK_WARN means that the save location is valid, but there's an existing file there.
        // Therefore the user must confirm that this is what they want to do.
        if ( liveScene.status === STATUS.OK_WARN && ignore_warning === false){
            var msg = 'This will overwrite an existing scene. Continue?';
            if (!Window.confirm(msg)) return false;
        }
        // Final check for correct status flags -- 
        if ( liveScene.status === STATUS.OK || 
             liveScene.status === STATUS.OK_WARN ){
            // get a filename for the scene
            var aepFile = new File(liveScene.getFullPath()['primary']);
            // save the file
            try {
                app.project.save(aepFile);
            } catch (e) {
                liveScene.log.write(ERR, errorMessages['failed_save'], e);
            }
            // make a copy of the file as a backup
            try {
                aepFile.copy( liveScene.getFullPath()['backup'] );
             } catch (e) { 
                liveScene.log.write(ERR, errorMessages['failed_backup'], e);
            }/**/
            return true;
        } else return false;
    }


    /*********************************************************************************************
    AUTOMATION TOOLS
    *********************************************************************************************/
    /* Batch out all teams in this production's teams database. */
    function batchAllTeams () {
        batchTeamList(liveScene.prod.teamlist);
    }
    /**
     * This function will prompt the user for a list of teams for batching. The teams must be valid
     * teams.json database keys, and must be separated by commas.
     */
    function batchManualList () {
        var teamlist = Window.prompt('Team ids, separated by commas');
        if (teamlist === "" || teamlist === null) return false;
        teamlist = teamlist.replace(/^\s+|\s+$/g, "");
        teamlist = teamlist.split(',');
        batchTeamList(teamlist);
    }
    /**
     * This function will generate a list of teams based on a key/value pair passed by the user
     * via a prompt. See the espnCore.getTeamsByCategory() method for details on the prompts.
     * This is a power-user function and requires knowledge of the teams.json schema.
     */
    function batchCategoryList () {
        var category = "NULL";
        var value = "NULL";
        // Prompt for category (database key) and value to match
        category = Window.prompt('Category:');
        value = Window.prompt('Value:');
        // return false if the user cancels or enters nothing
        if (category === null || category === "" || value === null || value === "") return false;
        // remove leading and trailing whitespace
        category = category.replace(/^\s+|\s+$/g, "");
        value = value.replace(/^\s+|\s+$/g, "");
        // get a list of teams matching the data
        var teamlist = liveScene.prod.getTeamsByCategory(category, value);
        // and batch them out
        batchTeamList(teamlist);
    }
    /**
     * This function will run through a list of teams, and individually set that team, add the
     * project comps to the render queue, save the scene, then add it to the current .bat file
     * for final rendering. The list of teams must be an array of strings that are database
     * keys for that production's team database. (Usually the team's name or tricode).
     * @param {Array} teamlist - A list of team database keys (strings)
     */    
    function batchTeamList (teamlist) {
        // this function will override the "include in file name" checkboxes
        // store the current value for "use tricode"
        liveScene.use_team0id = true;
        /*
        var tmp = liveScene.use_team0id;
        // override the "use tricode" value (leaving the rest as-is)
        setNamingFlagsCheckboxes([
            true,
            liveScene.use_showid,
            liveScene.use_customA,
            liveScene.use_customB,
            liveScene.use_customC,
            liveScene.use_customD
        ]);
        */
        // keep a running list of any failed teams
        var alert_list = [];

        for (t in teamlist) {
            if (!liveScene.prod.teamlist.hasOwnProperty(t)) continue;
            try {
                var team = teamlist[t];
                // set the home team dropdown (this will run all team switching functions)
                setHomeTeamMenu(team);
                // set up renders & save
                addRenderCompsToQueue();
                saveWithBackup(true);
                addProjectToBatch();
            } catch(e) { 
                // any failed teams will be added to the report
                alert_list.push(team);
                continue; 
            }
        }
        /*
        // restore original "use tricode" value
        setNamingFlagsCheckboxes([
            tmp,
            liveScene.use_showid,
            liveScene.use_customA,
            liveScene.use_customB,
            liveScene.use_customC,
            liveScene.use_customD
        ]);
        */
        // report any failed teams
        if (alert_list.length > 0) 
            alert('The following teams could not be batched:\n' + alert_list.join(', '));
    }
    
    function pickleLogoSheet () {
        var output    = {};
        var selection = app.project.selection;
        try {
            for (i in selection) {
                if (!selection.hasOwnProperty(i)) continue;
                var siz = [selection[i].width, selection[i].height];
                var pos = selection[i].layers[1].transform.position.value;
                var anx = selection[i].layers[1].transform.anchorPoint.value;
                var scl = selection[i].layers[1].transform.scale.value;

                output[selection[i].name] = {
                    "Size": siz,
                    "Pos": pos,
                    "Anx": anx,
                    "Scl": scl
                }
            }
            output = JSON.stringify(output);

            var txt = prompt('A new .json will be created on your desktop.', 'new_logosheet.json', 'Enter a file name');
            if (txt !== null) {
                try {
                    var outJsn = new File( '~/Desktop/{0}'.format(txt));
                    outJsn.open('w');
                    outJsn.write(output);
                } catch (e) {
                    alert ('Error writing file: \n' + e.message);
                } finally {
                    outJsn.close();
                }
            }
        } catch(e) { alert('{0}: {1}'.format(e.line, e.message)) }
    }

    /*********************************************************************************************
    RENDER QUEUEING
    *********************************************************************************************/
    function addRenderCompsToQueue ( wip ) {
        var movName;
        var outputDir;
        var renderComps = getRenderComps( wip );
                
        // deactivate all current items
        var RQitems = app.project.renderQueue.items;
        for (var i=1; i<=RQitems.length; i++){
            try {
                RQitems[i].render = false;
            } catch(e) { null; }
        }
        try {
            for (c in renderComps){
                if (!renderComps.hasOwnProperty(c)) continue;
                var rqi = RQitems.add( renderComps[c] );
                rqi.outputModules[1].applyTemplate("QT RGBA STRAIGHT")
                movName = liveScene.getRenderName(renderComps[c].name, "mov");
                if (wip === undefined){
                    outputDir = liveScene.getFolder("qt_final");    
                } else {
                    outputDir = liveScene.getFolder("qt_wip"); 
                }
                rqi.outputModules[1].file = new File (outputDir +'/'+ movName); 
            }            
        } catch(e) {
            liveScene.log.write(ERR, errorMessages['failed_queue'], e);
        }
    }

    function addProjectToBatch () {
        // opens the bat file, adds a new line with the scene, and closes it
        var aepFile = app.project.file.fsName.toString();
        var execStr = "\"C:\\Program Files\\Adobe\\Adobe After Effects CC 2015\\Support Files\\aerender.exe\" -mp -project \"{0}\"".format(aepFile);
        RENDER_BAT_FILE.open("a");
        try{
            RENDER_BAT_FILE.writeln(execStr);            
        } catch(e) { 
            null;
        } finally {
            RENDER_BAT_FILE.close();
        }  
    }
    
    function openBatchForEditing () {
        // opens the bat file for editing in notepad
        var execStr = "start \"\" notepad {0}".format(RENDER_BAT_FILE.fsName.toString());
        EDIT_BAT_FILE.open("w");
        EDIT_BAT_FILE.write(execStr);
        EDIT_BAT_FILE.execute();
    }
    
    function runBatch () {
        // executes the bat file
        RENDER_BAT_FILE.execute();
    }
    
    function startNewBatch () {
        RENDER_BAT_FILE.open("w");
        RENDER_BAT_FILE.close();
    }
    
    /*********************************************************************************************
    AUTO-TRACE TOOL
    *********************************************************************************************/
    // gone fishin' (moved to its own module)
    
    /*********************************************************************************************
    UI LAYOUT
    *********************************************************************************************/    
    function ESPNToolsUI (thisObj) {
        var versionStr = "v{0}.{1}.{2}".format(espnCore.version[0], espnCore.version[1], espnCore.version[2]);
		var dlg = (thisObj instanceof Panel) ? thisObj : new Window("palette", "ESPNTools", undefined, {resizeable:true});
        
		if (dlg !== null) {
            // Load resource
            var res = new File((new File($.fileName).parent.toString()) + '/res/ESPNTools.res');
            res.open('r');
            dlg.grp = dlg.add(res.read());
            // Boilerplate
            dlg.layout.layout(true);
            dlg.grp.minimumSize = [100,0];
            dlg.layout.resize();
            dlg.onResizing = dlg.onResize = function () { this.layout.resize(); } 
            
            dlg.grp.tabs.setup.versionText.text = versionStr;
            
            // Setup Tab
            dlg.grp.tabs.setup.build.createTemplate.onClick       = buildProjectTemplate;
            dlg.grp.tabs.setup.build.createOfflineTemplate.onClick= buildOfflineProjectTemplate;
            dlg.grp.tabs.setup.createProject.onClick        = saveWithBackup;
            dlg.grp.tabs.setup.production.dd.onChange       = function () { changedProduction() };
            dlg.grp.tabs.setup.projectName.edit.e.onChange  = function () { changedProject() };
            dlg.grp.tabs.setup.projectName.pick.dd.onChange = function () { changedProject() };
            dlg.grp.tabs.setup.sceneName.e.onChange         = function () { changedProjectName() };
            dlg.grp.tabs.setup.useExisting.cb.onClick       = function () { changedProject(false) };
            dlg.grp.tabs.setup.updateUI.onClick             = initialize;
            
            // Toolkit Tab
            dlg.grp.tabs.toolkit.expClr.onClick = function () { removeExpressionOnSelected() };
            dlg.grp.tabs.toolkit.expAdd.onClick = function () {
                var sel = dlg.grp.tabs.toolkit.expPick.selection.toString();
                var exp = liveScene.prod.getPlatformData()['Expressions'][sel];
                setExpressionOnSelected(exp);
            };
            dlg.grp.tabs.toolkit.teamScript.et.onChange = function () { changedScript( "team" ) };
            dlg.grp.tabs.toolkit.awayScript.et.onChange = function () { changedScript( "away" ) };
            dlg.grp.tabs.toolkit.showScript.et.onChange = function () { changedScript( "show" ) };
            dlg.grp.tabs.toolkit.custScript.et.onChange = function () { changedScript( "cust" ) }; 
            
            // Versioning Tab
            dlg.grp.tabs.version.div.fields.team.dd.onChange = changedHomeTeam;
            dlg.grp.tabs.version.div.fields.away.dd.onChange = changedAwayTeam;
            dlg.grp.tabs.version.div.fields.shows.dd.onChange = changedShow;
            dlg.grp.tabs.version.div.fields.customA.et.onChange = changedCustomText;
            dlg.grp.tabs.version.div.fields.customB.et.onChange = changedCustomText;
            dlg.grp.tabs.version.div.fields.customC.et.onChange = changedCustomText;
            dlg.grp.tabs.version.div.fields.customD.et.onChange = changedCustomText;
            dlg.grp.tabs.version.div.checks.cbT.onClick = changedNamingFlags;
            dlg.grp.tabs.version.div.checks.cbS.onClick = changedNamingFlags;
            dlg.grp.tabs.version.div.checks.cbA.onClick = changedNamingFlags;
            dlg.grp.tabs.version.div.checks.cbB.onClick = changedNamingFlags;
            dlg.grp.tabs.version.div.checks.cbC.onClick = changedNamingFlags;
            dlg.grp.tabs.version.div.checks.cbD.onClick = changedNamingFlags;
            dlg.grp.tabs.version.save.onClick           = function () { saveWithBackup(true) };
            dlg.grp.tabs.version.bat.addToBat.onClick   = addProjectToBatch;
            dlg.grp.tabs.version.bat.checkBat.onClick   = openBatchForEditing;
            dlg.grp.tabs.version.bat.clearBat.onClick   = startNewBatch;
            dlg.grp.tabs.version.bat.runBat.onClick     = runBatch;
            dlg.grp.tabs.version.queue.addFinal.onClick = function () { addRenderCompsToQueue() };
            dlg.grp.tabs.version.queue.addWip.onClick   = function () { addRenderCompsToQueue(true) };
        
            // Batching Tab
            dlg.grp.tabs.tdtools.batchAll.onClick = function () { 
                try{ batchAllTeams(); }
                catch(e) {alert(e.message); }
            };
            dlg.grp.tabs.tdtools.batchSome.onClick = function () {
                try { batchManualList(); }
                catch(e) { alert(e.message); }
            };
            dlg.grp.tabs.tdtools.batchCust.onClick = function () {
                try { batchCategoryList(); }
                catch(e) { alert(e.message); }
            };
            dlg.grp.tabs.tdtools.pickleSheet.onClick = pickleLogoSheet;
        }
        return dlg;
	}

    /*********************************************************************************************
    UI INSTANCING AND INITIALIZATION
    *********************************************************************************************/   
	var dlg = ESPNToolsUI(thisObj);
    if (dlg !== null){
        // WINDOW instance
        if  (dlg instanceof Window){
            dlg.center();
            dlg.show();
        } 
        // PANEL instance
        else
            dlg.layout.layout(true);
    }
    initialize();
    
    /// Initial visibility switches
    dlg.grp.tabs.setup.useExisting.cb.value = true;
    dlg.grp.tabs.setup.projectName.pick.visible = true;
    dlg.grp.tabs.setup.projectName.edit.visible = false;
    dlg.grp.tabs.version.div.checks.cbX.visible = false;

})(this);