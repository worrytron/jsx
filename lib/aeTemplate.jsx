#target aftereffects

$.evalFile(((new File($.fileName)).parent).toString() + '/espnCore.jsx');
$.evalFile(((new File($.fileName)).parent).toString() + '/aeCore.jsx');

// Locations for render .bat files
var RENDER_BAT_FILE = new File("~/aeRenderList.bat");
var EDIT_BAT_FILE   = new File("~/editRenderList.bat");

var template = {
    "dashboard" : ["0. Dashboard", "CompItem", {}],
    "precomps_bin"  : ["1. TOOLKIT PRECOMPS", "FolderItem", {
        "awaysheet" : ["Away Logosheet Master Switch", "CompItem", {}],
        "teamsheet" : ["Team Logosheet Master Switch", "CompItem", {}],
        "showsheet" : ["Show Logosheet Master Switch", "CompItem", {}]
    }],
    "working_bin" : ["2. WORKING FOLDER", "FolderItem", {}],
    "render_bin"  : ["3. RENDER COMPS", "FolderItem", {}],
    "tech_bin"    : ["X. DO NOT EDIT", "FolderItem", {
        "assets_bin": ["Asset Bin", "FolderItem", {
            "guides_bin" : ["Guidelayers", "FolderItem", {
                "bottomline": ["Guidelayers", "CompItem", {}]
            }],
            "team0_bin" : ["Team Logo Sheets", "FolderItem", {}],
            "team1_bin" : ["Away Logo Sheets", "FolderItem", {}],
            "spon0_bin" : ["Sponsor Logo Sheets", "FolderItem", {}],
            "show0_bin" : ["Show Logo Sheets", "FolderItem", {}],
            "asset1_bin" : ["Custom Asset 01", "FolderItem", {}],
            "asset2_bin" : ["Custom Asset 02", "FolderItem", {}],
            "asset3_bin" : ["Custom Asset 03", "FolderItem", {}],
            "asset4_bin" : ["Custom Asset 04", "FolderItem", {}],
            "asset5_bin" : ["Custom Asset 05", "FolderItem", {}],
            "script_bin" : ["Script Holders", "FolderItem", {
                "awayScript" : ["Away Script", "CompItem", {}],
                "teamScript" : ["Team Script", "CompItem", {}],
                "showScript" : ["Show Script", "CompItem", {}],
                "custScript" : ["Custom Text Script", "CompItem", {}]
            }]
        }],
        "wiprenderbin": ["WIP Render Comps", "FolderItem", {}]
    }]
}

function PipelineScene() {
    // attach logging function
    this.log = new Log('ae');
    // forward declarations
    this.awayLogosheet = null;
    this.teamLogosheet = null;
    this.showLogosheet = null;
    this.awayScript = null;   
    this.teamScript = null;   
    this.showScript = null;   
    this.custScript = null;   
    this.bottomline = null;   
    this.renderBin = null;    
    this.wipRenderBin = null; 

    // initialization tree
    this.Init = function() {
        this.Link();
        if (this.linked == 1)
            this.GetMetadata();
    };

    // probe scene for template objects
    this.Link = function () {
        this.linked = -1;
        this.dashboard = getItem("0. Dashboard");
        if (isValid(this.dashboard)){
            // check for rest of template objects
            this.awayLogosheet  = getItem(lookup(template, "awaysheet"));
            this.teamLogosheet  = getItem(lookup(template, "teamsheet"));
            this.showLogosheet  = getItem(lookup(template, "showsheet"));
            this.awayScript     = getItem(lookup(template, "awayScript"));
            this.teamScript     = getItem(lookup(template, "teamScript"));
            this.showScript     = getItem(lookup(template, "showScript"));
            this.custScript     = getItem(lookup(template, "custScript"));
            this.bottomline     = getItem(lookup(template, "bottomline"));
            this.renderBin      = getItem(lookup(template, "render_bin"), FolderItem);
            this.wipRenderBin   = getItem(lookup(template, "wiprenderbin"), FolderItem);            
            this.TestLink();
        }
    };

    // set linked flag
    this.TestLink = function () {
        var msg = "A piece of the template was missing: {0}. You may need to repair it.";
        if (!isValid(this.awayLogosheet)) {
            this.log.write(1, msg.format('Away Logosheet'));
            this.linked = 0;
        } if (!isValid(this.teamLogosheet)) {
            this.log.write(1, msg.format('Home Logosheet'));
            this.linked = 0;
        } if (!isValid(this.showLogosheet)) {
            this.log.write(1, msg.format('Show Logosheet'));
            this.linked = 0;
        } if (!isValid(this.awayScript))    {
            this.log.write(1, msg.format('Away Script Holder'));
            this.linked = 0;
        } if (!isValid(this.teamScript))    {
            this.log.write(1, msg.format('Home Script Holder'));
            this.linked = 0;
        } if (!isValid(this.showScript))    {
            this.log.write(1, msg.format('Show Script Holder'));
            this.linked = 0;
        } if (!isValid(this.custScript))    {
            this.log.write(1, msg.format('Custom Script Holder'));
            this.linked = 0;
        } if (!isValid(this.bottomline))    {
            this.log.write(1, msg.format('Bottomline Template'));
            this.linked = 0;
        } if (!isValid(this.renderBin))     {
            this.log.write(1, msg.format('Render Comps Bin'));
            this.linked = 0;
        } if (!isValid(this.wipRenderBin))  {
            this.log.write(1, msg.format('WIP Render Comps Bin'));
            this.linked = 0;
        } if (this.linked === -1){
            this.linked = 1;
        }
    };

    this.GetMetadata = function() {
        var metadata = null;
    };

    /*********************************************************************************************
    TEMPLATE BUILDERS
    *********************************************************************************************/
    /*
     * This builds the AfterEffects 'template' scene from the production's platform database. This 
     * function also builds and loads other production-specific toolkit items (team assets, 
     * the dashboard, etc.) 
     * This can all be rolled into one function at some point -- right now it is really slow.
     */
    this.BuildTemplate = function() {
        // Check for platform-specific JSON & load it if necessary
        // Build the bin/folder tree from JSON
        buildTemplateFromJson( template );
        
        this.Link(); // reattach scene links after building the template

        if (this.linked === 1) {
            this._populateDashboard();           // build dashboard text layers
            this._populateGuidelayer();          // assemble bottomline template
            //this._populateLogosheetComp(prod, 'team'); // import team logosheets
            //this._populateLogosheetComp(prod, 'away'); // away sheets
            //this._populateLogosheetComp(prod, 'show'); // show sheets
            //this._populateLogosheetComp(prod, 'sponsor');

            //this._populateCustomAssets();
            //this.BuildTemplatePrecomps(prod);
        }
    };

    this.LoadIntoTemplate = function (prod, type) {
        // 'team'
        // 'away'
        // 'show'
        // 'sponsor'
        // custom
    };
    /*
     * This builds and sets up the dashboard comp for the project. This is mostly text layers
     * that are used for toolkit expression links. These text layers get changed directly when 
     * the user interacts with the UI.
     */
    this._populateDashboard = function () {
        // Text layer names for versioning
        var textLayers = [
            "SHOW NAME",
            "HOME TEAM NAME",
            "HOME NICKNAME",
            "HOME LOCATION",
            "HOME TRICODE",
            "AWAY TEAM NAME",
            "AWAY NICKNAME",
            "AWAY LOCATION",
            "AWAY TRICODE",
            "CUSTOM TEXT A",
            "CUSTOM TEXT B",
            "CUSTOM TEXT C",
            "CUSTOM TEXT D"
        ];

        try {
            // Build a null used for scaling
            var pNull = this.dashboard.layer('Scaler Null');
            if (!pNull) {
                pNull = this.dashboard.layers.addNull();
                pNull.name = 'Scaler Null';
            }
            // Reset the null to 100%
            pNull.transform.position.setValue([0,0,0]);
            pNull.transform.scale.setValue([100,100,100]);
            // Calculate the new scale based on # of text layers
            var scale = (840 / (textLayers.length * 115)) * 100;
            // add background solid
            if (!(this.dashboard.layer('BACKGROUND'))){
                var bgnd = this.dashboard.layers.addSolid([0.17,0.17,0.17], 'BACKGROUND', 1920, 1080, 1.0, 60);
                bgnd.locked = true;
            }

            // build text layers based on the list above
            var ypi = 120;
            var pos = [0,0,0];
            for (var tl in textLayers){
                if (!textLayers.hasOwnProperty(tl)) continue;
                this._createDashboardTextLayer(textLayers[tl], pNull, pos, pNull);
                // change the Y value for the next time around the loop
                pos[1] += ypi;
            }
            // after building the text layers, set the scale of the null
            pNull.transform.scale.setValue([scale,scale,scale]);
            pNull.transform.position.setValue([65,80,0]);
        } catch (e) {
            this.log.write(0, "There was a problem building dashboard text layers.", e);
        }        
    };
    /* TODO: COMMENTS
    */
    this._createDashboardTextLayer = function (layerName, parent, pos, pNull) {
        var labelLayer = this.dashboard.layer(layerName + ' Label');
        var textLayer = this.dashboard.layer(layerName);
        // Font settings
        var font = "Tw Cen MT Condensed";
        var fontSizeBig = 90;
        var fontSizeSm = 33;

        if (!labelLayer) // if the label layer doesn't exist, build it
            labelLayer = buildTextLayer(layerName, this.dashboard, pos, font, fontSizeSm, 0, (layerName + ' Label'), false);
        else { // otherwise make sure it's in the right position
            labelLayer.locked = false;
            labelLayer.transform.position.setValue(pos);
        }

        if (!textLayer) // if the text layer doesn't exist, build it
            textLayer = buildTextLayer(layerName, this.dashboard, pos+[0,70,0], font, fontSizeBig, 0, layerName, false);
        else { // otherwise make sure it's in the right position
            textLayer.locked = false;
            textLayer.transform.position.setValue(pos+[0,70,0]);
        }
        // TODO: Fix the bug here where the scale doesn't reset to 100%
        // parent the text layers to the scaling null
        labelLayer.parent = pNull;
        labelLayer.locked = true;
        textLayer.parent = pNull;
        textLayer.locked = true;

        return [labelLayer, textLayer];
    };
    /*
     * Build the precomp used for the guide layer in WIP renders. Includes the bottom line
     * aend a project name / version / timecode burn-in at the bottom of the screen.
     */
    this._populateGuidelayer = function () {
        // Text layer settings
        var font = "Tw Cen MT Condensed";
        var fontSize = 67;
        var tcPos = [1651, 1071];
        // Get the reqired objects from the project bin
        var botline = getItem('ESPN_Bottomline_2018_Keyable_1920x1080.tga', FootageItem);
        // Load the bottomline.tga into the project if needed
        if (!botline) {
            try {
                var botline = "Y:/Workspace/DESIGN_RESOURCES/Bottomline/keyable_BtmLn_reference_examples/ESPN_Bottomline_2018_Keyable_1920x1080.tga";
                if ($.os.indexOf('Macintosh') > -1) 
                    botline = botline.replace('Y:','/Volumes/cagenas');
                botline = new File(botline);
                botline = importFile(botline, getItem("Guidelayers", FolderItem));
            } catch (e) {
                this.log.write(1, 'Bottomline guide not loaded.', e);
            }
        }
        // Delete all the layers from the comp (?? i don't remember why this is here)
        while (true) {
            try { 
                this.bottomline.layer(1).locked = false;
                this.bottomline.layer(1).remove();
            } catch(e) { break; }
        }
        // add the bottomline
        var blLayer = this.bottomline.layers.add(botline);
        blLayer.locked = true;
        // add the timecode and project name layers
        var tcLayer = buildTextLayer('', this.bottomline, tcPos, font, fontSize, 0, 'Timecode', true);
        tcLayer.text.sourceText.expression = "timeToTimecode();";
    };
    /* TODO: COMMENTS
    */
    this._populateLogosheetComp = function (type) {
        function AIFile (fileObj) {
            if (fileObj.name.indexOf('.ai') > -1)
                return true;
        }
        // NULL productions cannot be built or repaired
        if (this.sceneData.prod.name === "NULL") return false;
        
        var logosheetComp = getItem( lookup(Template,'{0}sheet'.format(type)) );
        var logosheetBin = getItem( lookup(Template,'{0}{1}_bin'.format(type_, t)));

        var asset; // avitem that represents the asset
        var lyr; // the layer of the asset
        // blame me for setting this up so badly
        // the template lookups use "team0" and "team1" as keys. everything else uses
        // "home" and "away".
        // type_ and t then become situational variables to resolve the mismatch when applicable.
        var t = 0
        var type_ = type;
        if (type === 'away'){
            t = 1;
            type_ = 'team';
        }

        try {
            if (firstFile === undefined)
                return false;

            // import the logosheet if none exists
            if (logosheetBin.numItems === 0) {
                var assetFolder = new Folder( this.sceneData.getFolder("{0}logos2d".format(type_)) );
                var firstFile = assetFolder.getFiles(AIFile)[0];
                asset = importFile(firstFile, assetFolder);
            } else {
                asset = logosheetBin.item(1);
            }

            // add the loaded logosheet to the comp
            try {
                lyr = logosheetComp.layer(1);
            } catch(e) {
                lyr = logosheetComp.layers.add(asset);
            }
            lyr.collapseTransformation = true;

        } catch(e) {
            this.log.write(WARN, "loadShowAssets: " + CODE['failed_biuld'], e);
        }
    }
    /*
     * This looks for any custom asset bins in the current project and will load the correct
     * custom asset footage into the bin.
     */
    this._populateCustomAssets = function () {
        if (this.sceneData.prod.name === "NULL") return false;
        // Look for each custom asset
        for (var i=1; i<=NUM_CUSTOM_ASSETS; i++) {
            try {
                // lookup the name of the bin in the ae database
                var customAssetBin = getItem( lookup(template,'asset{0}_bin'.format(i)), FolderItem );
                if (!customAssetBin) continue;
                // if it exists and is empty
                if (customAssetBin.numItems === 0) {
                    // lookup the asset folder on the server for that custom asset
                    var customAssetFolder = new Folder( this.sceneData.getFolder("customasset0{0}".format(i)) );
                    // load a random(-ish) file from that asset folder and put it in the bin
                    var firstFile = customAssetFolder.getFiles()[0];
                    importFile(firstFile, customAssetBin);
                }
            // Log any errors
            } catch(e) { 
                this.log.write(ERR, CODE['failed_build'], e);
            }
        }
    }
    /*
     * Builds the logo slick precomps set up in the production's platform database (ae.json)
     */
    this.BuildTemplatePrecomps = function (prod) {
        if (prod === undefined) {
            prod = 'NULL';
        }
        // Get the precomp layout from the platform database (only teams right now)
        var bin = getItem(lookup(Template, 'precomps_bin'));

        var teamLayout = loadLayout(prod, 'Team Logosheet');
        var showLayout = loadLayout(prod, 'Show Logosheet');

        this._createCompsFromLayout( teamLayout, this.teamLogosheet, bin, 'HOME ' );
        this._createCompsFromLayout( teamLayout, this.awayLogosheet, bin, 'AWAY ' );
        this._createCompsFromLayout( showLayout, this.showLogosheet, bin );

        return true;
    }

    function loadLayout (prod) {
        return;
    }
    /*
     * Builds the comps for a logosheet based on the JSON data stored in the production's ae.json.
     * 'tag' is an optional flag that will prepend a string to the precomp names (e.g. for HOME and AWAY)
     */
    this._createCompsFromLayout = function (layout, sheet, bin, tag, skipExisting) {
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
                this.log.write(1, 'There was a problem building the precomp for ' + name + '.', e);
            }
        }
    }

    /*********************************************************************************************
     * UTILITY FUNCTIONS
     * These are helper functions for pulling and setting scenedata
     ********************************************************************************************/
    this.GetRenderComps = function () {
        if (!this.TestLink()){
            this.sceneData.log.write(ERR, CODE['missing_template']);
        }
        // prep objects 
        var renderComps = [];

        var outputDir = this.sceneData.getFolder("qt_final");
        // check for the bin with the render comps
        // array all render comps
        for (var i=1; i<=this.renderCompBin.items.length; i++){
            renderComps.push(this.renderCompBin.items[i]);
        }               
        // removed WIP render options in 1.1

        return renderComps;
    }

    /*********************************************************************************************
    RENDER QUEUEING
    *********************************************************************************************/
    this.AddRenderCompsToQueue = function () {
        var movName;
        var outputDir;
        var renderComps = getRenderComps();
                
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
                movName = sceneData.getRenderName(renderComps[c].name, "mov");
                if (wip === undefined){
                    outputDir = sceneData.getFolder("qt_final");    
                } else {
                    outputDir = sceneData.getFolder("qt_wip"); 
                }
                rqi.outputModules[1].file = new File (outputDir +'/'+ movName); 
            }            
        } catch(e) {
            sceneData.log.write(ERR, CODE['failed_queue'], e);
        }
    }

    this.AddProjectToBatch = function () {
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
    
    this.OpenBatchForEditing = function () {
        // opens the bat file for editing in notepad
        var execStr = "start \"\" notepad {0}".format(RENDER_BAT_FILE.fsName.toString());
        EDIT_BAT_FILE.open("w");
        EDIT_BAT_FILE.write(execStr);
        EDIT_BAT_FILE.execute();
    }
    
    this.RunBatch = function () {
        // executes the bat file
        RENDER_BAT_FILE.execute();
    }
    
    this.StartNewBatch = function () {
        RENDER_BAT_FILE.open("w");
        RENDER_BAT_FILE.close();
    }

    /*
     * When the liveScene is ready to be synchronized to AfterEffects and saved to the network,
     * this function pushes the tempScene to the liveScene, verifies that the handoff was successful,
     * prompts the user for overwrite confirmation (if necessary). Once that's done, it saves the
     * file (and its backup) to the network. 
     */
    this.SaveWithBackup = function (ignore_warning) {
        (!ignore_warning) ? ignore_warning = false : ignore_warning = true;
        
        var sync = pushTempToLive();
        if (!sync || 
            sceneData.status === STATUS.NO_DEST || 
            sceneData.status === STATUS.CHECK_DEST || 
            sceneData.status === STATUS.UNDEFINED) {
            
            sceneData.log.write(ERR, CODE['invalid_scenedata']);
            return false;
        }
        // STATUS.OK_WARN means that the save location is valid, but there's an existing file there.
        // Therefore the user must confirm that this is what they want to do.
        if ( sceneData.status === STATUS.OK_WARN && ignore_warning === false){
            var msg = 'This will overwrite an existing scene. Continue?';
            if (!Window.confirm(msg)) return false;
        }
        // Final check for correct status flags -- 
        if ( sceneData.status === STATUS.OK || 
             sceneData.status === STATUS.OK_WARN ){
            // get a filename for the scene
            var aepFile = new File(sceneData.getFullPath()['primary']);
            // save the file
            try {
                app.project.save(aepFile);
            } catch (e) {
                sceneData.log.write(ERR, CODE['failed_save'], e);
            }
            // make a copy of the file as a backup
            try {
                aepFile.copy( sceneData.getFullPath()['backup'] );
             } catch (e) { 
                sceneData.log.write(ERR, CODE['failed_backup'], e);
            }/**/
            return true;
        } else return false;
    }

    this.SetMetadata = function () {

    }

    this.GetMetadata = function () {

    }

    /*********************************************************************************************
     * SWITCH FUNCTIONS
     * These functions directly alter the linked After Effects project.
     ********************************************************************************************/
    /* TODO: COMMENTS
     */
    this.SwitchLogosheet = function (type) {
        var err = -1;

        var t = 0
        var type_ = type;
        if (type === 'away'){
            t = 1;
            type_ = 'team';
        }

        var bin = '{0}{1}_bin'.format(type_, t);
        bin = getItem( lookup(Template,bin), FolderItem );
        if (!bin.numItems === 0)
            err = 1;

        var assetFolder = '{0}logos2d'.format(type_);
        assetFolder = new File( this.sceneData.getFolder( assetFolder ));
        if (!assetFolder.exists)
            err = 1;

        var logoSheet = '{0}/{1}.ai'.format(assetFolder.fullName, this.sceneData[type_]['name']);
        logoSheet = new File(logoSheet);
        if (!logoSheet.exists)
            err = 1;

        if (err === 1) {
            this.sceneData.log.write(ERR, CODE['missing_template']);
            return false;
        }

        var oldLogoSheet = bin.item(1);
        oldLogoSheet.replace(logoSheet);
    }
    /* TODO: COMMENTS
     */
    this.SwitchDashboardTextLayers = function (type) {
        var t = 0;
        var type_ = type;
        var tag = '';

        if (type === 'away'){
            t = 1;
            type_ = 'team';
            tag = 'AWAY';
        } 

        // team text layers
        if (type == "team" || type == "away") {     
            var layerNames = [ 
                "{0}TEAM NAME",
                "{0}NICKNAME",
                "{0}LOCATION",
                "{0}TRICODE"
            ];
            var layerData = [
                "dispName",
                "nickname",
                "location",
                "tricode"
            ];
            for (l in layers) {
                try {
                    var lyr = this.dashboard.layer(layers[l].format(tag));
                    var data = this.sceneData.teams[t][layerData[l]].toUpperCase();
                    lyr.property('Text').property('Source Text').setValue(data);
                } catch (e) {
                    this.sceneData.log.write(WARN, CODE['missing_textlayers'], e);
                }
            }
        // everything besides team text layers
        } else {
            try {
                var lyr = this.dashboard.layer('{0} NAME'.format(type));
                var data = this.sceneData[type].name.toUpperCase();
                lyr.property('Text').property('Source Text').setValue(data);
            } catch (e) {
                this.sceneData.log.write(WARN, CODE['missing_textlayers'], e);
            }
        }
    }
    /*
     * TODO: ADD COMMENTS
     */
    this.SwitchCustomText = function () {
        var cust = ['A','B','C','D'];
        try {
            for (s in cust){
                if (!cust.hasOwnProperty(s)) continue;
                this.dashboard.layer('CUSTOM TEXT {0}'.format(cust[s])).property("Text").property("Source Text").setValue(this.sceneData["custom{0}".format(cust[s])]);
            }            
        } catch(e) {
            this.log.write(0, CODE['missing_textlayers'], e);
        }
    }
    /*
     * Sets the this.sceneData metadata on the pipelined scene's dashboard tag
     * TODO: THIS NEEDS A TOTAL OVERHAUL
     */
    this.SwitchDashboardTag = function () {
        try {
            this.dashboard.comment = this.sceneData.getTag().toString();
            setDashboardLayer('PROJECT_NAME', this.sceneData.project.toString());
            setDashboardLayer('SCENE_NAME', this.sceneData.name.toString());
            setDashboardLayer('VERSION', 'v' + zeroFill(this.sceneData.version.toString(), 3));
        } catch (e) {
            tempScene.log.write(ERR, CODE['failed_tagging'], e);
            return false;
        }
        return true;
    }
    /*
     * This function scans the custom assets bins and looks for the first word in the name
     * of the bin. If that name matches "which", it switches that asset with the type specified
     * in the conditional tree of the function. Currently only "team" and "away" are supported.
     * @param {string} which - "team" or "away"
     */
    this.SwitchCustomAssets = function (which) {
        for (var i=1; i<=NUM_CUSTOM_ASSETS; i++){
            // lookup the name of each custom asset bin
            var assetTag = lookup(Template,'asset{0}_bin'.format(i));
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
                        id = this.sceneData.teams[0].id;     
                    } else if (which === "away") {
                        id = this.sceneData.teams[1].id;
                    }
                } catch(e) {
                    this.sceneData.log.write(WARN, CODE['missing_template']);
                }
                try {
                    // If everything is ready, now actually switch the asset using the custom asset folder, 
                    // the id of the new asset, and the extension
                    var customAssetDir = this.sceneData.getFolder("customasset0{0}".format(i));
                    var newAsset = new File ("{0}/{1}.{2}".format(customAssetDir, id, ext));
                    avitem.replace(newAsset);
                } catch(e) {
                    this.sceneData.log.write(WARN, 'Couldn\'t load custom asset {0} for {1}.'.format(i, id));
                }
            }
        }
    }
    /*
     * This function will eval the contents of the custom user scripts fields in the UI.
     * @param {string} which - The field to eval() ('team', 'away', etc)
     */
    this.EvalUserScripts = function (which) {
        if (!which) return false;
        // get the script holder comp for which
        var comp = lookup(Template,'{0}Script'.format(which));
        comp = getItem(comp);
        if (!comp) {
            // No big deal if it's missing, just log a warning
            this.sceneData.log.write(WARN, CODE['missing_template']);
            return null;
        } else {
            try {
                // Eval the comment on the script holder comp
                eval(comp.comment);
            } catch(e) {
                // Error if the eval fails
                this.sceneData.log.write(ERR, CODE['failed_eval'], e);
            }
        }
    }

    this.Init();
}


