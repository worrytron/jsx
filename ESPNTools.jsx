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
        'failed_queue'      : 'There was a problem adding items to your render queue.\n(Check that you have an output preset called "QT RGBA STRAIGHT")',
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
            liveScene.log.write(INFO, 'Loaded {0}'.format(liveScene.project));
        // If the scene has a valid pipeline tag, but the server location isn't there for some reason
        } else if (tempScene.status === STATUS.NO_DEST) {
            liveScene = tempScene;
            var msg = "This scene has moved and its save location is no longer valid. Please re-save immediately.";
            liveScene.log.write(WARN, msg);
            // Warn the user but load it anyway
            initializeFromLiveScene();
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
        switchDashboardTag();
        evalUserScripts('cust');
    }
    /*
     * Updates the tempScene.teams[0] data when the dropdown is changed
     */      
    function changedHomeTeam () {
        var teamid = dlg.grp.tabs.version.div.fields.team.dd.selection;
        if (teamid.toString() === liveScene.teams[0].name) return null;
        
        liveScene.setTeam(0, teamid.toString());
        
        switchTeam(0);
        switchDashboardTag();
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
        
        switchTeam(1);
        switchDashboardTag();
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
        
        switchShow();
        switchDashboardTag();
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
    TEMPLATE BUILDERS
    *********************************************************************************************/
    /*
     * This builds the AfterEffects 'template' scene from the production's platform database. This 
     * function also builds and loads other production-specific toolkit items (team assets, 
     * the dashboard, etc.) 
     * This can all be rolled into one function at some point -- right now it is really slow.
     */
    function buildProjectTemplate () {
        // Check for platform-specific JSON & load it if necessary
        var templateData = liveScene.prod.getPlatformData()['Template'];
        // Build the bin/folder tree from JSON
        buildProjectFromJson( templateData );
        buildDashboard();
        buildGuidelayer();
        loadTeamAssets();
        loadShowAssets();
        //loadSponsorAssets();
        loadCustomAssets();
        buildToolkittedPrecomps();
    }
    /*
     * TODO: ADD COMMENTS
     */
    function buildOfflineProjectTemplate() {
        var templateCheck = getItem( liveScene.templateLookup('dashboard') );
        if (templateCheck === undefined) 
            buildProjectTemplate();
        loadOfflineAssets('team');
        loadOfflineAssets('show');
        loadOfflineAssets('away');
        /*
        loadOfflineAssets('asset1');
        loadOfflineAssets('asset2');
        loadOfflineAssets('asset3');
        loadOfflineAssets('asset4');
        loadOfflineAssets('asset5');
        */
        
        buildOfflineDashboard();
    }
    /*
     * This builds and sets up the dashboard comp for the project. This is mostly text layers
     * that are used for toolkit expression links. These text layers get changed directly when 
     * the user interacts with the UI.
     */
    function buildDashboard () {
        // Font settings
        var font = "Tw Cen MT Condensed";
        var posBig = [65,150,0];
        var posSm = [65,80,0];
        var ypi = 120;
        var fontSizeBig = 90;
        var fontSizeSm = 33;
        // Text layer names for versioning
        var textLayers = [
            "SHOW NAME",
            "TEAM NAME",
            "NICKNAME",
            "LOCATION",
            "TRICODE",
            "AWAY TEAM NAME",
            "AWAY NICKNAME",
            "AWAY LOCATION",
            "AWAY TRICODE",
            "CUSTOM TEXT A",
            "CUSTOM TEXT B",
            "CUSTOM TEXT C",
            "CUSTOM TEXT D"
        ];
        // Project names for WIP comp tags
        var systemTextLayers = [
            "PROJECT NAME",
            "SCENE NAME",
            "VERSION"
        ];
        
        try {
            // Get the dashboard
            var dashboard = getItem( liveScene.templateLookup('dashboard') );
            // Build a null used for scaling
            var pNull = dashboard.layer('NULL');
            if (!pNull) {
                pNull = dashboard.layers.addNull();
                pNull.name = 'NULL';
                pNull.transform.position.setValue([68,60,0]);
            }
            // Reset the null to 100%
            pNull.transform.scale.setValue([100,100,100]);
            // Calculate the new scale based on # of text layers
            var scale = (840 / (textLayers.length * 115)) * 100;
            // add background solid
            if (!(dashboard.layer('BACKGROUND'))){
                var bgnd = dashboard.layers.addSolid([0.17,0.17,0.17], 'BACKGROUND', 1920, 1080, 1.0, 60);
                bgnd.locked = true;
            }
            var labelLayer;
            var textLayer;
            // build text layers based on the list above
            for (var tl in textLayers){
                if (!textLayers.hasOwnProperty(tl)) continue;
                // check if they already exist -- each layer is created twice, once as the "main" layer and once
                // as its "label", which is smaller and never changes.
                var labelLayer = dashboard.layer(textLayers[tl] + ' Label');
                var textLayer = dashboard.layer(textLayers[tl]);
                // build it if not
                if (!labelLayer)
                    labelLayer = buildTextLayer(textLayers[tl], dashboard, posSm, font, fontSizeSm, 0, (textLayers[tl] + ' Label'), false);
                else {
                    // set the position if it already exists (in case the # or order of layers has changed)
                    labelLayer.locked = false;
                    labelLayer.transform.position.setValue(posSm);
                }
                // repeat for the 'main' layers
                if (!textLayer)
                    textLayer = buildTextLayer(textLayers[tl], dashboard, posBig, font, fontSizeBig, 0, textLayers[tl], false);
                else {
                    textLayer.locked = false;
                    textLayer.transform.position.setValue(posBig);
                }
                // parent the text layers to the scaling null
                labelLayer.parent = pNull;
                labelLayer.locked = true;
                textLayer.parent = pNull;
                textLayer.locked = true;
                // change the Y value for the next time around the loop
                posBig[1] += ypi;
                posSm[1] += ypi;
            }
            // after building the text layers, set the scale of the null
            pNull.transform.scale.setValue([scale,scale,scale]);
            
            // system text font settings
            var y = 1072.7;        
            var sysFontSize = 27;
            var sysPos = [71,y,0];
            var exp = "[(thisComp.layer('{0}').sourceRectAtTime().width + thisComp.layer('{1}').position[0])+5, {2},0];";
            var prev = '';
            // build system text layers
            for (i in systemTextLayers){
                if (!systemTextLayers.hasOwnProperty(i)) continue;
                var lyr = dashboard.layer(systemTextLayers[i]);
                if (!lyr) lyr = buildTextLayer('', dashboard, sysPos, font, sysFontSize, 0, systemTextLayers[i], true);
                if (systemTextLayers[i] !== "PROJECT NAME"){
                    // the 'scene name' and 'version' text layers are offset from the previous layer
                    lyr.transform.position.expression = exp.format(prev, prev, y);
                }
                prev = systemTextLayers[i];
            }
        } catch (e) {
            liveScene.log.write(ERR, errorMessages['failed_build'], e);
        }        
    }
    /*
     * This modifies the dashboard to work as an offline version, which requires the building
     * of additional support comps.
     */
    function buildOfflineDashboard () {
        var w = 100;
        var h = 100;
        var d = 1;
        var par = 1.0;
        var fr = 59.94;
        
        var teamNameComp = app.project.items.addComp('Team Names', w,h,par,d,fr);
        var teamNicknameComp = app.project.items.addComp('Team Nicknames', w,h,par,d,fr);
        var teamTricodeComp = app.project.items.addComp('Team Tricodes', w,h,par,d,fr);
        var teamLocationComp = app.project.items.addComp('Team Locations', w,h,par,d,fr);
        var awayNameComp = app.project.items.addComp('Away Names', w,h,par,d,fr);
        var awayNicknameComp = app.project.items.addComp('Away Nicknames', w,h,par,d,fr);
        var awayTricodeComp = app.project.items.addComp('Away Tricodes', w,h,par,d,fr);
        var awayLocationComp = app.project.items.addComp('Away Locations', w,h,par,d,fr);
        var showNameComp = app.project.items.addComp('Show Names', w,h,par,d,fr);
        
        var scriptBin = getItem( liveScene.templateLookup('script_bin'), FolderItem );
        
        teamNameComp.parentFolder = scriptBin;
        teamNicknameComp.parentFolder = scriptBin;
        teamTricodeComp.parentFolder = scriptBin;
        teamLocationComp.parentFolder = scriptBin;
        awayNameComp.parentFolder = scriptBin;
        awayNicknameComp.parentFolder = scriptBin;
        awayTricodeComp.parentFolder = scriptBin;
        awayLocationComp.parentFolder = scriptBin;
        showNameComp.parentFolder = scriptBin;
        
        //for (t in liveScene.prod.teamlist){
        for (var i=0; i<liveScene.prod.teamlist.length; i++){
            var t = liveScene.prod.teamlist[i];
            if (t === "NULL" || t === "ESPN_META") continue;
            
            var team = liveScene.prod.teams[t];
          
            var n;
            n = teamNameComp.layers.addNull(d);
            n.name = team["DISPLAY NAME"];
            n.moveToEnd();
        
            n = teamNicknameComp.layers.addNull(d);
            n.name = team["NICKNAME"];
            n.moveToEnd();

            n = teamTricodeComp.layers.addNull(d);
            n.name = team["TRI"];
            n.moveToEnd();
            
            n = teamLocationComp.layers.addNull(d);
            n.name = team["LOCATION"];
            n.moveToEnd();            
            
            n = awayNameComp.layers.addNull(d);
            n.name = team["DISPLAY NAME"];
            n.moveToEnd();
            
            n = awayNicknameComp.layers.addNull(d);
            n.name = team["NICKNAME"];
            n.moveToEnd();
            
            n = awayTricodeComp.layers.addNull(d);
            n.name = team["TRI"];
            n.moveToEnd();
            
            n = awayLocationComp.layers.addNull(d);
            n.name = team["LOCATION"];
            n.moveToEnd();
            
        }

        //for (s in liveScene.prod.showlist){
        for (var i=0; i<liveScene.prod.showlist.length; i++){
            //if (!liveScene.prod.showlist.hasOwnProperty(s)) continue;
            var s = liveScene.prod.showlist[i];
            var show = liveScene.prod.shows[s];
            var n;
            n = showNameComp.layers.addNull(d);
            n.name = show["NAME"];
            n.moveToEnd();
        }
        
        var dashboard = getItem( liveScene.templateLookup('dashboard') );
        try {
            //if (thisComp.layer('{0}').effect('{1}')('Layer').index == thisLayer.index) 100 else 0".format(ctrlnull.name, ctrlsel.name);
    
            dashboard.layer('SHOW NAME').text.sourceText.expression = "comp('Show Names').layer( comp('Show Logosheet Master Switch').layer(1).effect('SHOW Picker').layer.index-1 ).name";
            
            dashboard.layer('TEAM NAME').text.sourceText.expression = "comp('Team Names').layer( comp('Team Logosheet Master Switch').layer(1).effect('TEAM Picker').layer.index-1 ).name";
            dashboard.layer('NICKNAME').text.sourceText.expression = "comp('Team Nicknames').layer( comp('Team Logosheet Master Switch').layer(1).effect('TEAM Picker').layer.index-1 ).name";
            dashboard.layer('TRICODE').text.sourceText.expression = "comp('Team Tricodes').layer( comp('Team Logosheet Master Switch').layer(1).effect('TEAM Picker').layer.index-1 ).name";
            dashboard.layer('LOCATION').text.sourceText.expression = "comp('Team Locations').layer( comp('Team Logosheet Master Switch').layer(1).effect('TEAM Picker').layer.index-1 ).name";

            dashboard.layer('AWAY TEAM NAME').text.sourceText.expression = "comp('Team Names').layer( comp('Away Logosheet Master Switch').layer(1).effect('TEAM Picker').layer.index-1 ).name";
            dashboard.layer('AWAY NICKNAME').text.sourceText.expression = "comp('Team Nicknames').layer( comp('Away Logosheet Master Switch').layer(1).effect('TEAM Picker').layer.index-1 ).name";
            dashboard.layer('AWAY TRICODE').text.sourceText.expression = "comp('Team Tricodes').layer( comp('Away Logosheet Master Switch').layer(1).effect('TEAM Picker').layer.index-1 ).name";
            dashboard.layer('AWAY LOCATION').text.sourceText.expression = "comp('Team Locations').layer( comp('Away Logosheet Master Switch').layer(1).effect('TEAM Picker').layer.index-1 ).name";

        } catch(e) {
            liveScene.log.write(ERR, errorMessages['missing_template'], e);            
        }        
    }
    /*
     * Build the precomp used for the guide layer in WIP renders. Includes the bottom line
     * and a project name / version / timecode burn-in at the bottom of the screen.
     */
    function buildGuidelayer () {
        // Text layer settings
        var font = "Tw Cen MT Condensed";
        var fontSize = 67;
        var tcPos = [1651, 1071];
        var nmPos = [93.7, 1071];
        // Get the reqired objects from the project bin
        var guidelayerComp = getItem( liveScene.templateLookup('bottomline') );
        var guidelayerBin  = getItem( liveScene.templateLookup('guides_bin'), FolderItem );
        var botline        = getItem('Bottomline.tga', FootageItem);
        // Load the bottomline.tga into the project if needed
        if (!botline) {
            try {
                var imOptions = new ImportOptions();
                var botline = getGlobalAssets()['bottomline'];
                if ($.os.indexOf('Macintosh') > -1) 
                    botline = botline.replace('Y:','/Volumes/cagenas');
                imOptions.file = new File( botline );
                imOptions.sequence = false;
                imOptions.importAs = ImportAsType.FOOTAGE;
                botline = app.project.importFile(imOptions);
                botline.parentFolder = guidelayerBin;                
            } catch (e) {
                liveScene.log.write(ERR, errorMessages['failed_build'], e);
            }
        }
        // Delete all the layers from the comp (?? i don't remember why this is here)
        while (true) {
            try { 
                guidelayerComp.layer(1).locked = false;
                guidelayerComp.layer(1).remove();
            }
            catch(e) { break; }
        }
        // add the bottomline
        var blLayer = guidelayerComp.layers.add(botline);
        blLayer.locked = true;
        // add the timecode and project name layers
        var tcLayer = buildTextLayer('', guidelayerComp, tcPos, font, fontSize, 0, 'Timecode', true);
        var nmLayer = buildTextLayer('', guidelayerComp, nmPos, font, fontSize, 0, 'Project', true);
        tcLayer.text.sourceText.expression = "timeToTimecode();";
        nmLayer.text.sourceText.expression = "comp('{0}').layer('{1}').text.sourceText;".format("0. Dashboard", "PROJECT NAME");
    }
    /*
     * Builds the comps for a logosheet based on the JSON data stored in the production's ae.json.
     * 'tag' is an optional flag that will prepend a string to the precomp names (e.g. for HOME and AWAY)
     */
    function buildComps(layout, sheet, bin, tag, skipExisting) {
        (skipExisting === undefined) ? skipExisting = true : skipExisting = false;
        // c is a comp defined in the logosheet JSON data
        for (c in layout){
            if (!layout.hasOwnProperty(c)) continue;
            // Add "HOME" or "AWAY" to the comp name
            var name = c;
            if (tag !== undefined) name = "{0}{1}".format(tag, name);
            // Skip the comp if it already exists
            var comp = getItem(name);
            // the "force" flag is applied during offline conversions.
            // ordinarily (when force is false) existing comps are simply skipped over
            if (comp !== undefined && skipExisting === true){
                continue;
            }
            // Build the comp from JSON data
            try {
                // when skipExisting is false, it is *assumed* that the precomps exist, are empty, and need the layers re-added.
                if (comp == undefined)
                    comp = app.project.items.addComp(name, layout[c]["Size"][0], layout[c]["Size"][1], 1.0, 60, 59.94);   
                comp.parentFolder = bin;
                layer = comp.layers.add(sheet);
                layer.position.setValue(layout[c]["Pos"]);
                layer.anchorPoint.setValue(layout[c]["Anx"]);
                layer.scale.setValue(layout[c]["Scl"]);
                layer.collapseTransformation = true;                    
            } catch(e) {
                liveScene.log.write(WARN, errorMessages['missing_template'], e);
            }
        }
    }
    /*
     * Builds the logo slick precomps set up in the production's platform database (ae.json)
     */
    function buildToolkittedPrecomps () {
        // Get the project items needed
        var homeLogosheetComp = getItem( liveScene.templateLookup('teamsheet') );
        var awayLogosheetComp = getItem( liveScene.templateLookup('awaysheet') );
        var showLogosheetComp = getItem( liveScene.templateLookup('showsheet') );
        var precompsBin       = getItem( liveScene.templateLookup('precomps_bin'), FolderItem );
        // If any are missing, bail out
        if (homeLogosheetComp === undefined || awayLogosheetComp === undefined || showLogosheetComp === undefined || precompsBin === undefined) {
            liveScene.log.write(ERR, errorMessages['missing_template']);
        }
        // Get the precomp layout from the platform database (only teams right now)
        var teamLayout = liveScene.prod.getPlatformData()['Team Logosheet'];
        var showLayout = liveScene.prod.getPlatformData()['Show Logosheet'];
        
        // Build the home and away team precomps
        try {
            buildComps( teamLayout, homeLogosheetComp, precompsBin, 'HOME ' );
            buildComps( teamLayout, awayLogosheetComp, precompsBin, 'AWAY ' );
        } catch(e) {
            liveScene.log.write(ERR, errorMessages['failed_build'], e);
        }
        
        try {
            buildComps( showLayout, showLogosheetComp, precompsBin );
        } catch(e) {
            liveScene.log.write(WARN, errorMessages['failed_build'], e);
        }
    }
    /*
     * This function loads the logo slicks for the home and away teams. The team information
     * comes from the liveScene.teams array (0 for home, 1 for away).
     */
    function loadTeamAssets () {
        // This function is used to filter only .ai files when passed to Folder.getFiles()
        function AIFile (fileObj) {
            if (fileObj.name.indexOf('.ai') > -1 && (fileObj.name.indexOf(".") != 0))
                return true;
        }
        // Don't load team assets for "NULL" production.
        if (liveScene.prod.name === "NULL") return false;
        // Get project template objects needed for loading
        var homeLogosheetComp = getItem( liveScene.templateLookup('teamsheet') );
        var awayLogosheetComp = getItem( liveScene.templateLookup('awaysheet') );
        var homeLogosheetBin = getItem( liveScene.templateLookup('team0_bin'), FolderItem );
        var awayLogosheetBin = getItem( liveScene.templateLookup('team1_bin'), FolderItem );
        // If they don't exist, alert the user and bail out
        if (!homeLogosheetComp || 
            !awayLogosheetComp ||
            !homeLogosheetBin  ||
            !awayLogosheetBin) {
            
            liveScene.log.write(ERR, errorMessages['missing_template']);
            return false;
        }
        // Start loading assets
        try {
            // get first team slick in team logo slicks folder
            var teamFolder = new Folder( liveScene.getFolder("teamlogos2d") );
            // this is where AIFiles gets passed to the getFiles as a filter
            var firstFile = teamFolder.getFiles(AIFile)[0];
            // setup the slick for importing
            var imOptions = new ImportOptions();
            imOptions.file = firstFile;
            imOptions.sequence = false;
            imOptions.importAs = ImportAsType.FOOTAGE;
            
            // Only if the home team logo sheet bin is empty ...
            if (homeLogosheetBin.numItems === 0) {
                // ... import the file, parent it and add it to the comp
                var homeAiFile = app.project.importFile(imOptions);
                homeAiFile.parentFolder = homeLogosheetBin;
            }
            var lyr;
            // Add the logoslick to the comp if it's not there already
            try {
                lyr = homeLogosheetComp.layer(1);
            } catch(e) {
                lyr = homeLogosheetComp.layers.add(homeAiFile);
            }
            lyr.collapseTransformation = true;
            
            // And the away team
            if (awayLogosheetBin.numItems === 0){
                var awayAiFile = app.project.importFile(imOptions);
                awayAiFile.parentFolder = awayLogosheetBin;
            }
            // And the away comp
            try {
                lyr = awayLogosheetComp.layer(1);
            } catch(e) {
                lyr = awayLogosheetComp.layers.add(awayAiFile);
            }
            lyr.collapseTransformation = true;
            
            return true;       
            
        } catch(e) {
            liveScene.log.write(ERR, "loadTeamAssets: " + errorMessages['failed_build'], e);
        }
    }
    /*
     * TODO: COMMENTS
     */
    function loadShowAssets () {
        function AIFile (fileObj) {
            if (fileObj.name.indexOf('.ai') > -1 && (fileObj.name.indexOf(".") != 0))
                return true;
        }
        // Don't load show assets for "NULL" production
        if (liveScene.prod.name === "NULL") return false;
        // Get project template objects needed for loading
        var showLogosheetComp = getItem( liveScene.templateLookup('showsheet') );
        var showLogosheetBin = getItem( liveScene.templateLookup('show0_bin'), FolderItem );
        
        if (!showLogosheetComp ||
            !showLogosheetBin) {
            liveScene.log.write(ERR, errorMessages['missing_template']);
            return false;
        }
        
        try{
            var showFolder = new Folder( liveScene.getFolder("showlogos2d") );
            var firstFile = showFolder.getFiles(AIFile)[0];
            if (firstFile === undefined) return false;
            
            var imOptions = new ImportOptions();
            imOptions.file = firstFile;
            imOptions.sequence = false;
            imOptions.importAs = ImportAsType.FOOTAGE;
            
            if (showLogosheetBin.numItems === 0) {
                var showAiFile = app.project.importFile(imOptions);
                showAiFile.parentFolder = showLogosheetBin;
            }
            
            var lyr;
            try {
                lyr = showLogosheetComp.layer(1);
            } catch(e) {
                lyr = showLogosheetComp.layers.add(showAiFile);
            }
            lyr.collapseTransformation = true;
            return true;
        } catch(e) {
            liveScene.log.write(WARN, "loadShowAssets: " + errorMessages['failed_build'], e);
        }
    }
    /*
     * This looks for any custom asset bins in the current project and will load the correct
     * custom asset footage into the bin.
     */
    function loadCustomAssets () {
        function MacOSFilter (fileObj) {
            if (fileObj.name.indexOf(".") != 0)
                return true;
        }
        if (liveScene.prod.name === "NULL") return false;
        // Look for each custom asset
        for (var i=1; i<=NUM_CUSTOM_ASSETS; i++) {
            try {
                // lookup the name of the bin in the ae database
                var customAssetBin = getItem( liveScene.templateLookup('asset{0}_bin'.format(i)), FolderItem );
                if (!customAssetBin) continue;
                // if it exists and is empty
                if (customAssetBin.numItems === 0) {
                    // lookup the asset folder on the server for that custom asset
                    var customAssetFolder = new Folder( liveScene.getFolder("customasset0{0}".format(i)) );
                    // load a random(-ish) file from that asset folder and put it in the bin
                    var firstFile = customAssetFolder.getFiles(MacOSFilter)[0];
                    var imOptions = new ImportOptions();
                    imOptions.file = firstFile;
                    imOptions.sequence = false;
                    imOptions.importAs = ImportAsType.FOOTAGE;
                    var avitem = app.project.importFile(imOptions);
                    avitem.parentFolder = customAssetBin;   
                }
            // Log any errors
            } catch(e) { 
                liveScene.log.write(ERR, errorMessages['failed_build'], e);
            }
        }
    }
    /*
     * TODO: COMMENTS
     */
    function loadOfflineAssets (tag) {
        if (tag === undefined) return false;
        function AIFile (fileObj) {
            if (fileObj.name.indexOf('.ai') > -1 && (fileObj.name.indexOf(".") != 0))
                return true;
        }
        // SPECIAL CASES
        // For away teams, remove all bins and comps that are no longer needed
        if (tag == 'away') {
            // duplicate the 'team' comp and rename it
            try {
                var awaysheetBin = getItem( liveScene.templateLookup('team1_bin'), FolderItem );
                var awaysheetComp = getItem( liveScene.templateLookup('awaysheet') );

                awaysheetBin.remove();
                awaysheetComp.remove();
                
                var templateData = liveScene.prod.getPlatformData()['Team Logosheet'];
                var teamsheetComp = getItem( liveScene.templateLookup('teamsheet') );
                var precompsBin = getItem( liveScene.templateLookup('precomps_bin'), FolderItem );
                
                awaysheetComp = teamsheetComp.duplicate();
                awaysheetComp.name = liveScene.templateLookup('awaysheet');
                buildComps(templateData, awaysheetComp, precompsBin, 'AWAY ', false);
                
            } catch(e) {
                liveScene.log.write(ERR, errorMessages['missing_template'], e);
            }
            // exit the operation
            return true;
        }
        
        // STEP 1 : PREP TEMPLATE & LOAD IN ALL ASSETS
        try {
            // get the precomps bin
            var precompsBin   = getItem( liveScene.templateLookup('precomps_bin'), FolderItem );
            // get master switch comp being modified
            var logosheetComp = getItem( liveScene.templateLookup('{0}sheet'.format(tag)) );
            // get the asset bin to be populated
            var logosheetBin = getItem( liveScene.templateLookup('{0}0_bin'.format(tag)), FolderItem );
            // if any pieces are missing, bail out
            if (logosheetComp === undefined || precompsBin === undefined){
                liveScene.log.write(ERR, errorMessages['missing_template']);
            }
            // clean out the asset bin
            for (i=1; i<=logosheetBin.numItems; i++) {
                logosheetBin.item(1).remove();
            }

            
            // get all team assets ready to import
            var assetFolder = new Folder( liveScene.getFolder("{0}logos2d".format(tag)) );
            var assetList = assetFolder.getFiles(AIFile);
            if (assetList.length === 0) return;

            // import all team assets to requested bin
            for (t in assetList){
                if (!assetList.hasOwnProperty(t)) continue;
                var imOptions  = new ImportOptions();
                imOptions.file = assetList[t];
                imOptions.sequence = false;
                imOptions.importAs = ImportAsType.FOOTAGE;
                try {
                    var aiFile = app.project.importFile(imOptions);
                    aiFile.parentFolder = logosheetBin;
                } catch(e) {
                    liveScene.log.write(ERR, errorMessages['failed_build']);
                }
        
            }
        } catch (e) {
            alert(e + '\n' + e.message);
        }
                
        // STEP 2 : BUILD THE SWITCHING COMPS WITH THE NEW ASSETS     
        var ctrlnull = logosheetComp.layers.addNull();
        var ctrlsel = ctrlnull.property("Effects").addProperty("Layer Control");
        
        ctrlnull.name = "SELECT {0} - see effects".format(tag.toUpperCase());
        ctrlsel.name = "{0} Picker".format(tag.toUpperCase());

        for (var i=1; i<=logosheetBin.items.length; i++){
            // dump all assets into switch comp
            var lyr = logosheetComp.layers.add(logosheetBin.item(i));
            lyr.collapseTransformation = true;
            lyr.moveToEnd();
            lyr.opacity.setValue(0);
            lyr.shy = true;
            lyr.opacity.expression = "if (thisComp.layer('{0}').effect('{1}')('Layer').index == thisLayer.index) 100 else 0".format(ctrlnull.name, ctrlsel.name);
        }

        logosheetComp.hideShyLayers = true;
        ctrlsel.property("Layer").setValue(2);
            
        return true;
    }
    /*
     * TODO: COMMENTS
     */    
    function loadOfflineCustomAssets () {}
    
    /*********************************************************************************************
     * SWITCH FUNCTIONS
     * These functions directly alter the loaded After Effects project, sourcing information from
     * the liveScene object *only*.
     ********************************************************************************************/
    /*
     * Sets the liveScene metadata on the pipelined scene's dashboard tag
     */
    function switchDashboardTag () {
        try {
            var dashboard = getItem('0. Dashboard');
            dashboard.comment = liveScene.getTag().toString();
            dashboard.layer('PROJECT NAME').text.sourceText.setValue(liveScene.project.toString());
            dashboard.layer('SCENE NAME').text.sourceText.setValue(liveScene.name.toString());
            dashboard.layer('VERSION').text.sourceText.setValue('v' + zeroFill(liveScene.version.toString(), 3));
        } catch (e) {
            tempScene.log.write(ERR, errorMessages['failed_tagging'], e);
            return false;
        }
        return true;
    }
    
    function switchTeam (idx) {
        var msg = "Parts of your project template seem to be missing. Run Build Template to repair it.";
        // Gather up and validate all the required AE objects
        // lookup the team logo slick project bin
        var logoBin = getItem( liveScene.templateLookup('team{0}_bin'.format(idx)), FolderItem );
        // dashboard
        var dashComp = getItem( liveScene.templateLookup('dashboard') );
        // lookup the production's team logo slick folder 
        var teamLogoFolder = new File(liveScene.getFolder( 'teamlogos2d' ))        
        // build a file path for the new logo slick
        var newLogoSheet = new File( '{0}/{1}.ai'.format(teamLogoFolder.fullName, liveScene.teams[idx].name) );

        if (dashComp === undefined || 
            logoBin === undefined  || 
            !teamLogoFolder.exists || 
            !newLogoSheet.exists   ||
            logoBin.numItems === 0)
            {
                liveScene.log.write(ERR, errorMessages['missing_template']);
                return null;
            }
        
        // replace the logo slick
        var logoSheet = logoBin.item(1);
        logoSheet.replace(newLogoSheet);

        // switch appropriate text layers -- if the idx is not 0 or 1 this is skipped.
        var tag = "";
        if (idx === 0) tag = "";
        else if (idx === 1) tag = "AWAY ";
        else {
            liveScene.log.write(WARN, 'Invalid flag passed to switchTeam idx: {0}'.format(idx));
            return null;
        }
        try {
            dashComp.layer('{0}TEAM NAME'.format(tag)).property('Text').property('Source Text').setValue(liveScene.teams[idx].dispName.toUpperCase());
            dashComp.layer('{0}NICKNAME'.format(tag)).property('Text').property('Source Text').setValue(liveScene.teams[idx].nickname.toUpperCase());
            dashComp.layer('{0}LOCATION'.format(tag)).property('Text').property('Source Text').setValue(liveScene.teams[idx].location.toUpperCase());
            dashComp.layer('{0}TRICODE'.format(tag)).property('Text').property('Source Text').setValue(liveScene.teams[idx].tricode.toUpperCase());
        } catch(e) {
            liveScene.log.write(ERR, errorMessages['missing_textlayers'], e);
        }
    }
    /*
     * TODO: ADD COMMENTS
     */
    function switchShow () {
        var msg = "Parts of your project template seem to be missing. Run Build Template to repair it.";
        
        var logoBin = getItem( liveScene.templateLookup('show0_bin'), FolderItem );
        var dashComp = getItem( liveScene.templateLookup('dashboard') );
        var showLogoFolder = new File( liveScene.getFolder( 'showlogos2d') );
        var newLogoSheet = new File( '{0}/{1}.ai'.format(showLogoFolder.fullName, liveScene.show.id ) );
        if (dashComp === undefined ||
            logoBin === undefined  ||
            !showLogoFolder.exists ||
            !newLogoSheet.exists   ||
            logoBin.numItems === 0)
            {
                liveScene.log.write(ERR, errorMessages['missing_template']);
                return null;
            }
        var logoSheet = logoBin.item(1);
        logoSheet.replace(newLogoSheet);
        
        try {
            dashComp.layer('SHOW NAME').property('Text').property('Source Text').setValue(liveScene.show.name.toUpperCase());
        } catch (e) {
            liveScene.log.write(WARN, errorMessages['missing_textlayers'], e);
        }
    }
    
    function switchSponsor () {}
    /*
     * TODO: ADD COMMENTS
     */
    function switchCustomText () {
        var dashComp = getItem( liveScene.templateLookup('dashboard') );
        if (dashComp === undefined){
            liveScene.log.write(ERR, errorMessages['missing_dashboard']);
            return null;
        }
        var cust = ['A','B','C','D'];
        try {
            for (s in cust){
                if (!cust.hasOwnProperty(s)) continue;
                dashComp.layer('CUSTOM TEXT {0}'.format(cust[s])).property("Text").property("Source Text").setValue(liveScene["custom{0}".format(cust[s])]);
            }            
        } catch(e) {
            liveScene.log.write(ERR, errorMessages['missing_textlayers'], e);
        }
    }
    /*
     * This function scans the custom assets bins and looks for the first word in the name
     * of the bin. If that name matches "which", it switches that asset with the type specified
     * in the conditional tree of the function. Currently only "team" and "away" are supported.
     * @param {string} which - "team" or "away"
     */
    function switchCustomAssets (which) {
        for (var i=1; i<=NUM_CUSTOM_ASSETS; i++){
            // lookup the name of each custom asset bin
            var assetTag = liveScene.templateLookup('asset{0}_bin'.format(i));
            // if [which] is the first word in the folder name
            if (assetTag.toLowerCase().indexOf(which) === 0){
                try {
                    // get the bin itself now
                    var customAssetBin = getItem( assetTag, FolderItem ); 
                    if (!customAssetBin || customAssetBin.numItems > 1 || customAssetBin.numItems == 0) {
                        continue;
                    } else {
                        // since the file extension is not known (could be .mov or .png or whatever)
                        // the extension has to be stored as a variable
                        var avitem = customAssetBin.item(1);
                        var ext = avitem.name.split('.')
                        ext = ext[ext.length-1];
                    }
                    // ADD NEW TYPES HERE (currently only TEAM and AWAY)
                    var id = "";
                    // "id" is the file name prefix of the new asset to load. This will vary 
                    // based on "which" and must be programmed for new categories.
                    if (which === "team") {
                        id = liveScene.teams[0].id;     
                    } else if (which === "away") {
                        id = liveScene.teams[1].id;
                    }
                } catch(e) {
                    liveScene.log.write(WARN, errorMessages['missing_template']);
                }
                try {
                    // If everything is ready, now actually switch the asset using the custom asset folder, 
                    // the id of the new asset, and the extension
                    var customAssetDir = liveScene.getFolder("customasset0{0}".format(i));
                    var newAsset = new File ("{0}/{1}.{2}".format(customAssetDir, id, ext));
                    avitem.replace(newAsset);
                } catch(e) {
                    liveScene.log.write(WARN, 'Couldn\'t load custom asset {0} for {1}.'.format(i, id));
                }
            }
        }
    }
    /*
     * This function will eval the contents of the custom user scripts fields in the UI.
     * @param {string} which - The field to eval() ('team', 'away', etc)
     */
    function evalUserScripts (which) {
        if (!which) return false;
        // get the script holder comp for which
        var comp = liveScene.templateLookup('{0}Script'.format(which));
        comp = getItem(comp);
        if (!comp) {
            // No big deal if it's missing, just log a warning
            liveScene.log.write(WARN, errorMessages['missing_template']);
            return null;
        } else {
            try {
                // Eval the comment on the script holder comp
                eval(comp.comment);
            } catch(e) {
                // Error if the eval fails
                liveScene.log.write(ERR, errorMessages['failed_eval'], e);
            }
        }
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
    function getRenderComps (wip) {
        (wip === undefined) ? wip = false : wip = true;
        // prep objects 
        var renderComps = [];
        
        var renderCompBin = getItem(liveScene.templateLookup("render_bin"), FolderItem);
        var outputDir = liveScene.getFolder("qt_final");
        // check for the bin with the render comps
        if (!renderCompBin){
            liveScene.log.write(ERR, errorMessages['missing_template']);
        }
        // array all render comps
        for (var i=1; i<=renderCompBin.items.length; i++){
            renderComps.push(renderCompBin.items[i]);
        }               
        // extra steps to prepare "WIP" versions of render comps
        if (wip) {
            try {
                // check for the destination bin for WIP render comps
                var wipBin = liveScene.templateLookup('wiprenderbin', FolderItem);
                wipBin = getItem(wipBin, FolderItem);
                
                while(true){
                    try { wipBin.items[1].remove(); }
                    catch(e) { break; }
                }            
                // find the WIP template comp
                var wipRenderGuides = getItem(liveScene.templateLookup("bottomline"));
                // redirect render output to WIP folder
                outputDir = liveScene.getFolder("qt_wip");
                for (var i in renderComps){
                    if (!renderComps.hasOwnProperty(i)) continue;
                    // duplicate the WIP template
                    var wipComp = wipRenderGuides.duplicate();
                    // add the render comp to the duped template
                    var c = wipComp.layers.add(renderComps[i]);
                    c.moveToEnd();
                    wipComp.duration = renderComps[i].duration;

                    var dash = getItem( liveScene.templateLookup("dashboard") );

                    var exp = """project = comp('{0}').layer('{1}').text.sourceText;\
scene = comp('{0}').layer('{2}').text.sourceText;\
if (scene != '') (project + '_' + scene + ' v{3}') else (project + ' v{3}');""".format(dash.name, "PROJECT NAME", "SCENE NAME", zeroFill(liveScene.version, 3));
                    wipComp.layer('Project').text.sourceText.expression = exp;
                    // move it to the WIP bin
                    wipComp.parentFolder = wipBin;
                    // add a timestamp to the comp name
                    wipComp.name = renderComps[i].name + timestamp();
                    // replace the comp in the array with the wip version
                    renderComps[i] = wipComp;
                }
            } catch(e) {
                liveScene.log.write(ERR, errorMessages['failed_wipque'], e);
            }
        }
        return renderComps;
    }
    
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