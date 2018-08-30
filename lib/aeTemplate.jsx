#target aftereffects

$.evalFile(((new File($.fileName)).parent).toString() + '/espnCore.jsx');
$.evalFile(((new File($.fileName)).parent).toString() + '/aeCore.jsx');

// Locations for render .bat files
var RENDER_BAT_FILE = new File("~/aeRenderList.bat");
var EDIT_BAT_FILE   = new File("~/editRenderList.bat");

function PipelineScene () {
    // attach logging function
    this.log = new Log();
    // forward declarations
    this.awayLogosheet = null;
    this.homeLogosheet = null;
    this.showLogosheet = null;
    this.awayScript = null;   
    this.teamScript = null;   
    this.showScript = null;   
    this.custScript = null;   
    this.bottomline = null;   
    this.renderBin = null;    
    this.wipRenderBin = null; 
    this.template = {};
    // output files
    this.fileName = "";
    this.projectPath = new Folder("~/");
    this.scenePath   = new Folder("~/");
    this.renderPath  = new Folder("~/");

    // initialization tree
    this.Init = function() {
        this.template = validateJson(espnCore.templateJson, "ae_template");
        this.Link();
        //if (this.linked == 1)
            //this.GetMetadata();
    };
    // probe scene for template objects
    this.Link = function () {
        this.linked = -1;
        this.dashboard = getItem("0. Dashboard");
        if (isValid(this.dashboard)){
            // check for rest of template objects
            this.awayLogosheet  = getItem(lookup(this.template, "awaysheet"));
            this.homeLogosheet  = getItem(lookup(this.template, "teamsheet"));
            this.showLogosheet  = getItem(lookup(this.template, "showsheet"));
            this.awayScript     = getItem(lookup(this.template, "awayScript"));
            this.teamScript     = getItem(lookup(this.template, "teamScript"));
            this.showScript     = getItem(lookup(this.template, "showScript"));
            this.custScript     = getItem(lookup(this.template, "custScript"));
            this.bottomline     = getItem(lookup(this.template, "bottomline"));
            this.renderBin      = getItem(lookup(this.template, "render_bin"), FolderItem);
            this.wipRenderBin   = getItem(lookup(this.template, "wiprenderbin"), FolderItem);            
            this.TestLink();
        }
    };
    // set linked flag
    this.TestLink = function () {
        var msg = "A piece of the template was missing: {0}. You may need to repair it.";
        if (!isValid(this.awayLogosheet)) {
            this.log.write(1, msg.format('Away Logosheet'));
            this.linked = 0;
        } if (!isValid(this.homeLogosheet)) {
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

    /*********************************************************************************************
    TEMPLATE BUILDERS
    *********************************************************************************************/
    /*
     * This builds the AfterEffects 'template' scene from the production's platform database. This 
     * function also builds and loads other production-specific toolkit items (team assets, 
     * the dashboard, etc.) 
     * This can all be rolled into one function at some point -- right now it is really slow.
     */
    this.BuildTemplate = function (prod) {
        // Build the bin/folder tree from JSON
        buildTemplateFromJson(this.template);

        this.Link(); // reattach scene links after building the template
        // load production data
        if (prod === undefined) prod = 'NULL';
        //prod = new ProductionData(prod);
        if (this.linked === 1) {
            this.BuildDashboard();           // build dashboard text layers
            this.BuildGuidelayer();          // assemble bottomline template
            this.ImportLogosheet(prod, 'home'); // import team logosheets
            this.ImportLogosheet(prod, 'away'); // away sheets
            this.ImportLogosheet(prod, 'show'); // show sheets
            //this.ImportLogosheet(prod, 'misc'); // misc sheets
            //this.ImportCustom(prod);         // custom assets
            this.BuildAutoPrecomps(prod);    // build auto precomps
        }
    };
    /*
     * This builds and sets up the dashboard comp for the project. This is mostly text layers
     * that are used for toolkit expression links. These text layers get changed directly when 
     * the user interacts with the UI.
     */
    this.BuildDashboard = function () {
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
    /*
     * Build the precomp used for the guide layer in WIP renders. Includes the bottom line
     * aend a project name / version / timecode burn-in at the bottom of the screen.
     */
    this.BuildGuidelayer = function () {
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
    /*
     * TODO: COMMENTS
     */
    this.ImportLogosheet = function (prod, type) {
        function AIFile (fileObj) {
            if (fileObj.name.indexOf('.ai') > -1)
                return true;
        }
        // Forward declarations
        var path = "~/";  // main path where logosheets are stored
        var bin  = null;  // bin for this particular logosheet type
        var comp = null;  // comp for this logosheet type
        var ai   = null;  // ai file object
        var item = null;  // the AE AVitem for the ai file
        var lyr  = null;  // layer for the AVitem
        // Populate forward declarations
        if (type == "home") {
            path = espnCore.teamLogosheets;
            bin = getItem("Team Logo Sheets", FolderItem);
            comp = this.homeLogosheet;
        } else if (type == "away") {
            path = espnCore.teamLogosheets;
            bin = getItem("Away Logo Sheets", FolderItem);
            comp = this.awayLogosheet;
        } else if (type == "show") {
            path = espnCore.showLogosheets;
            bin = getItem("Show Logo Sheets", FolderItem);
            comp = this.showLogosheet;
        } else if (type == "misc") {
            path = espnCore.miscLogosheets;
            bin = getItem("Sponsor Logo Sheets", FolderItem);
        }
        // Import any available logosheet and put it in the correct bin
        if (bin.numItems === 0){
            path = new Folder(path + "/" + prod);
            if (path.exists) {
                ai = path.getFiles(AIFile)[0]; // first logosheet in the folder
            } else {
                this.log.write(0, "There was no production {0} logosheet folder for {1}".format(type, prod));
                return false;
            }
            if (ai == undefined) {
                this.log.write(0, "There was no production {0} logosheet folder for {1}".format(type, prod));
                return false;
            }
            item = importFile(ai, bin);
        } else {
            item = bin.item(1);
        }
        // Clear out the logosheet comp and re-add the AI as a layer
        while (true) {
            try { comp.layer(1).remove(); } 
            catch (e) { break; }
        }
        lyr = comp.layers.add(item);
        lyr.collapseTransformation = true;

        return true;
    };
    /*
     * This looks for any custom asset bins in the current project and will load the correct
     * custom asset footage into the bin.
     */
    this.ImportCustom = function (prod) {
        if (prod === "NULL") return false;
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
                //this.log.write(ERR, CODE['failed_build'], e);
            }
        }
    };
    /*
     * Builds the logo slick precomps set up in the production's platform database (ae.json)
     */
    this.BuildAutoPrecomps = function (prod) {
        function loadAutoLayout (prod, layout) {
            var path   = espnCore.rootJson + "/" + prod + "/ae.json";
            var data   = validateJson(path, layout);
            return data;
        }
        if (prod === undefined) {
            prod = 'NULL';
        }
        // Get the precomp layout from the platform database (only teams right now)
        var bin = getItem(lookup(this.template, 'precomps_bin'), FolderItem);

        var teamLayout = loadAutoLayout(prod, 'Team Logosheet');
        var showLayout = loadAutoLayout(prod, 'Show Logosheet');

        this._createCompsFromLayout( teamLayout, this.homeLogosheet, bin, 'HOME ' );
        this._createCompsFromLayout( teamLayout, this.awayLogosheet, bin, 'AWAY ' );
        this._createCompsFromLayout( showLayout, this.showLogosheet, bin );

        return true;
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
    // todo: comments
    this.GetMetadata = function () {
        var metadata = {};
        var comment = this.dashboard.comment;
        metadata = JSON.parse(comment);
        return metadata;
    };
    // todo: comments
    this.SetMetadata = function ( metadata ) {
        metadata = JSON.stringify(metadata);
        this.dashboard.comment = metadata;
    };
    /*
     * todo: comments
     */
    this.SetFileName = function () {
        var meta = this.GetMetadata();
        var nameArr = [meta.project, meta.scene];

        if (meta.filename_show == true)
            nameArr.push(meta.show);
        if (meta.filename_team0 == true)
            nameArr.push(meta.team0);
        if (meta.filename_team1 == true)
            nameArr.push(meta.team1);
        if (meta.filename_misc == true)
            nameArr.push(meta.misc);
        if (meta.filename_customA == true)
            nameArr.push(meta.customA);
        if (meta.filename_customB == true)
            nameArr.push(meta.customB);
        if (meta.filename_customC == true)
            nameArr.push(meta.customC);
        if (meta.filename_customD == true)
            nameArr.push(meta.customD);

        this.fileName = nameArr.join("_").split(" ").join("");
        return true;
    }
    /*
     * todo: comments
     */
    this.UpdatePaths = function () {
        this.SetFileName();
        var meta = this.GetMetadata();
        this.projectPath = new Folder(meta.root + "/" + meta.project);
        this.scenePath = new Folder(meta.root + "/" + meta.project + '/ae');
        this.renderPath = new Folder(meta.root + "/" + meta.project + '/qt_final');
    }
    /*
     * todo: comments
     */
    this.Save = function () {
        this.UpdatePaths();
        if (!this.projectPath.exists) {
            // todo : add alert!!!
            path = createProject(meta.root, meta.project, 'ae');
            this.log.write(2, "Project " + meta.project + " was created at " + meta.root);
        }
        app.project.save(this.scenePath + "/" + this.fileName + ".aep");
        // todo: figure out backups
        return true;
    }
    /*********************************************************************************************
     RENDER QUEUEING
    *********************************************************************************************/
    // todo: comments
    this.QueueRenders = function () {
        var fileName = "";
        this.UpdatePaths();
        clearRenderQueue();
        for (var i=1; i<=this.renderCompBin.items.length; i++){
            var comp = this.renderCompBin.item(i);
            fileName = [this.renderPath, comp.name, this.fileName];
            fileName = fileName.join("_") + ".mov";
            addCompToQueue(this.renderCompBin.item(i), fileName, null);
        }               
        // removed WIP render options in 1.1
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


