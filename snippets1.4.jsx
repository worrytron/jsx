

// UI script
function setDashboardLayer (dashboard, layer, value) {
	var dashboard = getItem('0. Dashboard');
	dashboard.comment = liveScene.getTag().toString();
	dashboard.layer(layer).text.sourceText.setValue(value);
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

        var guidelayerComp = getItem( liveScene.templateLookup('bottomline') );
        var guidelayerBin  = getItem( liveScene.templateLookup('guides_bin'), FolderItem );
        var botline        = getItem('Bottomline.tga', FootageItem);
        var homeLogosheetComp = getItem( liveScene.templateLookup('teamsheet') );
        var awayLogosheetComp = getItem( liveScene.templateLookup('awaysheet') );
        var showLogosheetComp = getItem( liveScene.templateLookup('showsheet') );
        var precompsBin       = getItem( liveScene.templateLookup('precomps_bin'), FolderItem );
 		var customAssetBin = getItem( liveScene.templateLookup('asset{0}_bin'.format(i)), FolderItem );
        var dashComp = getItem( liveScene.templateLookup('dashboard') );
        var renderCompBin = getItem(liveScene.templateLookup("render_bin"), FolderItem);
        var wipRenderGuides = getItem(liveScene.templateLookup("bottomline"));



