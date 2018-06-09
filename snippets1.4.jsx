function importFile (file, parent) {
	parent === undefined ? parent = null : parent = parent;

	try {
		var imOptions = new ImportOptions();
		imOptions.file = file;
		imOptions.sequence = false;
		imOptions.importAs = ImportAsType.FOOTAGE;
		var ai = app.project.importFile(imOptions);
		if (parent) ai.parentFolder = parent;
	} catch (e) {
		alert(e);
		return false;
	}
	return ai;
}

// UI script
function setDashboardLayer (dashboard, layer, value) {
	var dashboard = getItem('0. Dashboard');
	dashboard.comment = liveScene.getTag().toString();
	dashboard.layer(layer).text.sourceText.setValue(value);
}

function buildRepairLogosheetComp (type) {
	function AIFile (fileObj) {
		if (fileObj.name.indexOf('.ai') > -1)
			return true;
	}
	// NULL productions cannot be built or repaired
	if (liveScene.prod.name === "NULL") return false;
	
	var logosheetComp = getItem( liveScene.templateLookup('{0}sheet'.format(type)) );
	var logosheetBin = getItem( liveScene.templateLookup('{0}{1}_bin'.format(type_, t)));
	
	if (!logosheetComp || !logosheetBin) {
		liveScene.log.write(ERR, errorMessages['missing_template']);
		return false;
	}

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
			var assetFolder = new Folder( liveScene.getFolder("{0}logos2d".format(type_)) );
			var firstFile = showFolder.getFiles(AIFile)[0];
			asset = importFile(firstFile, showFolder);
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
		liveScene.log.write(WARN, "loadShowAssets: " + errorMessages['failed_biuld'], e);
	}
}

function buildDashboardTextLayer (layerName, parent, pos) {
	var labelLayer = dashboard.layer(layerName + ' Label');
	var textLayer = dashboard.layer(layerName);
    // Font settings
    var font = "Tw Cen MT Condensed";
    var fontSizeBig = 90;
    var fontSizeSm = 33;

	if (!labelLayer)
		labelLayer = buildTextLayer(layerName, dashboard, pos, font, fontSizeSm, 0, (layerName + ' Label'), false);
	else {
		labelLayer.locked = false;
		labelLayer.transform.position.setValue(posSm);
	}

	if (!textLayer)
		textLayer = buildTextLayer(layerName, dashboard, pos+[0,70,0], font, fontSizeBig, 0, layerName, false);
	else {
		textLayer.locked = false;
		textLayer.transform.position.setValue(posBig);
	}
	// TODO: Fix the bug here where the scale doesn't reset to 100%

    // parent the text layers to the scaling null
    labelLayer.parent = pNull;
    labelLayer.locked = true;
    textLayer.parent = pNull;
    textLayer.locked = true;

	return [labelLayer, textLayer];
}

function switchLogosheet (type) {
	var err = -1;

	var t = 0
	var type_ = type;
	if (type === 'away'){
		t = 1;
		type_ = 'team';
	}

	var bin = '{0}{1}_bin'.format(type_, t);
	bin = getItem( liveScene.templateLookup(bin), FolderItem );
	if (!bin.numItems === 0)
		err = 1;

	var assetFolder = '{0}logos2d'.format(type_);
	assetFolder = new File( liveScene.getFolder( assetFolder ));
	if (!assetFolder.exists)
		err = 1;

	var logoSheet = '{0}/{1}.ai'.format(assetFolder.fullName, liveScene[type_]['name']);
	logoSheet = new File(logoSheet);
	if (!logoSheet.exists)
		err = 1;

	if (err === 1) {
		liveScene.log.write(ERR, errorMessages['missing_template']);
		return false;
	}

	var oldLogoSheet = bin.item(1);
	oldLogoSheet.replace(logoSheet);

}

function switchDashboardTextLayers (type) {
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
				var lyr = dashboard.layer(layers[l].format(tag));
				var data = liveScene.teams[t][layerData[l]].toUpperCase();
				lyr.property('Text').property('Source Text').setValue(data);
			} catch (e) {
				liveScene.log.write(WARN, errorMessages['missing_textlayers'], e);
			}
		}
	// everything besides team text layers
	} else {
		try {
			var lyr = dashboard.layer('{0} NAME'.format(type));
			var data = liveScene[type].name.toUpperCase();
			lyr.property('Text').property('Source Text').setValue(data);
		} catch (e) {
			liveScene.log.write(WARN, errorMessages['missing_textlayers'], e);
		}
	}
}



XMPMeta.prototype.setDublinCoreData = function () {
    var xmp = this;
    xmp.appendArrayItem(XMPConst.NS_DC, "dc:publisher", "ESPN C&SD", 0, XMPConst.ARRAY_IS_ALTERNATIVE);
    //xmp.setProperty(XMPConst.NS_DC, "dc:author", "Mark Rohrer");
    //xmp.setProperty(XMPConst.NS_DC, "dc:copyright", "Copyright 2018 ESPN Productions Inc. All rights reserved.");
}

XMPMeta.prototype.getCustomData = function (field) {
    var xmp = this;
    if (!xmp.doesPropertyExist(XMPConst.NS_XMP, "ESPN"))
        return false;
    var value = xmp.getStructField(XMPConst.NS_XMP, "ESPN", XMPConst.TYPE_TEXT, field).value;
    return value;
}

XMPMeta.prototype.setCustomData = function (field, value) {
    var xmp = this;
    if (!xmp.doesPropertyExist(XMPConst.NS_XMP, "ESPN"))
        xmp.setProperty(XMPConst.NS_XMP, "ESPN", "", XMPConst.PROP_IS_STRUCT);
    xmp.setStructField(XMPConst.NS_XMP, "ESPN", XMPConst.TYPE_TEXT, field, value);
}

var xmp;
var proj = app.project;

if(ExternalObject.AdobeXMPScript == undefined)
    ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
xmp = new XMPMeta(proj.xmpPacket);        

xmp.setDublinCoreData();
xmp.setCustomData("Production", "MFFFLB");
xmp.setCustomData("Project", "MLkkkB_X_TEST");
xmp.setCustomData("Scene", "TESkkkkT2");
xmp.setCustomData("Version", "00kkkkkk02");

proj.xmpPacket = xmp.serialize();

$.writeln(xmp.serialize());








