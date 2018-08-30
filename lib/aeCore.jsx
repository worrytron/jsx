#target aftereffects

/**
 * Gets an AVItem from the project window by name, filtering by class.
 * @method getItem
 * @param {String} item_name The name of the item
 * @param {Object} class_ The class of object being searched for (default CompItem)
 * @returns {AVItem} The requested AVItem (type is determined by the search)
 */
function getItem(item_name, class_){
    /* Gets an item from the project window by name.  Looks for CompItem by default,
       but can be passed other objects (from the project window) to search for as well. */
    var comp;
    // Handling custom object parameter
    class_ = typeof class_ !== 'undefined' ? class_ : CompItem;
    // Search for the item by name
    for (var i=1; i<=app.project.numItems; i++){ 
        var item = app.project.item(i);
        // Check object type and name
        if ((item instanceof class_) && (item.name === item_name)){
            if (comp){
                alert('More than one item found with name ' + item_name + '.');
            }
            comp = item;
            break;
        }
    }
    return comp;
}

/**
 * Gets a layer from a comp by name.
 * @params {CompItem} comp - The comp being searched
 * @params {string} layer_name - Name of the layer being searched for
 * @returns {AVLayer} The requested layer
 */
function getLayer(comp, layer_name){
    // Searches a comp for a given layer (by name)
    var layer;
    for (var i=1; i<=comp.numLayers; i++){
        lay = comp.layer(i);
        if (lay.name === layer_name){
            if (layer){
                alert('More than one layer found with name ' + layer_name + '.');
            }
            layer = lay;
            break;
        }
    }
    return layer;
}

/**
 * Helper function for importing an AVItem (non-sequence)
 * @params {FileObject} file - A file object to import
 * @params {FolderItem} parent (optional) - A FolderItem to contain it
 */
function importFile (file, parent) {
    parent === undefined ? parent = false : parent = parent;
    try {
        var imOptions = new ImportOptions();
        imOptions.file = file;
        imOptions.sequence = false;
        imOptions.importAs = ImportAsType.FOOTAGE;
        var avitem = app.project.importFile(imOptions);
        if (parent) avitem.parentFolder = parent;
    } catch (e) {
        alert(e);
        return false;
    }
    return avitem;
}

/**
 * todo: comments
 */
function addCompToQueue (comp, out_path, out_module) {
    var queueItems = app.project.renderQueue.items;
    var rqi = queItems.add(comp);

    if (out_path != undefined || out_path != null) {
        rqi.outputModules[1].file = new File(out_path);
    }
    if (out_module != undefined || out_module != null) {
        if (rqi.outputModules[1].templates.indexOf(out_module) == -1) {
            var preset = new ImportOptions(new File('//cagenas/Workspace/SCRIPTS/AE/assets/{0}_preset.aep'.format(out_module.toLowercase())));
            createOutputModule(preset, out_module);
        }        
        setOutputModule(out_module);
    }
    return true;
}

/**
 * Sets the comment value on a specified item in the project window
 * @params {AVItem} item - The AVItem to be commented
 * @params {string} comment - The comment to be added
 */
function setComment(item, comment){
    try {
        item.comment = comment;
        return true;
    } catch(e) {
        // TODO __ ERROR HANDLING -- COULD NOT SET TAG
        return false;
    }
}

/**
 * Sets an expression on a selected property. This performs no validation.
 * @params {String} expression - The AVItem to be commented
 */
function setExpressionOnSelected (expression) {
    var props = app.project.activeItem.selectedProperties;
    if (props.length === 0) return false;
    for (var i=0; i<props.length; i++){
        if (props[i].canSetExpression){
            props[i].expression = expression;
            props[i].expressionEnabled = true;
        }
    }
}

/**
 * Removes any expressions on a selected property (including disabled ones.)
 */
function removeExpressionOnSelected () {
    var props = app.project.activeItem.selectedProperties;
    if (props.length === 0) return false;
    for (var i=0; i<props.length; i++){
        if (props[i].canSetExpression){
            props[i].expression = '';
            props[i].expressionEnabled = false;
        }
    }
}

/**
 * Clears all items from the render queue.
 */
function clearRenderQueue () {
    var RQitems = app.project.renderQueue.items;
    while (true) {
        try {
            RQitems[1].remove();
        } 
        catch(e) { break; }
    }
}

/**
 * Deselects all layers in the passed comp.
 * @param {CompItem} comp - A comp with layers you wish to deselect :)
 */
function deselectAllLayers (comp){
    var selLayers = comp.selectedLayers, n=selLayers.length;
    while (n--) selLayers[n].selected = false;
}

/**
 * Recursively builds a project bin (aka folder) tree from JSON data
 * @param {JSON} data - A json object with a folder structure
 */
function buildTemplateFromJson (data, parent) {
    for (k in data){
        if (!data.hasOwnProperty(k)) continue;
        // the eval("SomeItem") here is to be able to use getItem() to test whether this item
        // already exists
        var item = getItem( data[k][0], eval(data[k][1]) );

        if (data[k][1] === "FolderItem") {
            // skip unused custom asset bins
            if (data[k][0].indexOf("Custom Asset ") > -1) continue;
            // add the folderitem
            if (!item)
                item = app.project.items.addFolder(data[k][0]);
            if (parent) item.parentFolder = parent;
            // folders can have children, so recurse into its child object
            buildTemplateFromJson( data[k][2], item);
        }
        else if (data[k][1] === "CompItem") {
            if (!item)
                item = app.project.items.addComp(data[k][0],1920,1080,1.0,60,59.94);
            if (parent) item.parentFolder = parent;
        } 
    }
}

/**
 * Builds a text layer with many commonly-used parameters
 * @params {string} text - The text content of the new layer
 * @params {CompItem} comp - The comp the layer should be added to
 * @params {Vector3} pos - The xyz position for the new layer
 * @params {string} font - The name of the font to be used
 * @params {int} fontSize - The size of the font
 * @params {int} tracking - The tracking value for the text layer
 * @params {string} name - The name of the layer
 * @params {bool} locked - Whether the new layer should be locked
 * @returns {TextLayer}
 */
function buildTextLayer(text, comp, pos, font, fontSize, tracking, name, locked){
    (pos === undefined) ? pos = [0,0,0] : null;
    (font === undefined) ? font = 'Arial' : null;
    (fontSize === undefined) ? fontSize = 12 : null;
    (tracking === undefined) ? tracking = 0 : null;
    (locked === undefined) ? locked = false : null;
    
    // Create text layer
    var text_layer = comp.layers.addText(text);
    if (name !== undefined) text_layer.name = name;
    // Create text document (AE's "formatting" object)      
    var text_properties = text_layer.property("ADBE Text Properties").property("ADBE Text Document");
    var text_document = text_properties.value;

    text_document.fontSize = fontSize;
    text_document.font     = font;
    text_document.tracking = tracking;

    // Assign the formatting to the layer
    text_properties.setValue(text_document);

    // set the position for the text
    text_layer.position.setValue(pos)
    // assign it to a parent for scaling
    //text_layer.parent = parent;
    text_layer.locked = locked;

    return text_layer;
}

/*************************************************************************************************
 * AUTO-TRACE BACKEND FUNCTIONS
 ************************************************************************************************/
function autoTrace (comp){
    if (comp === undefined) var comp = app.project.activeItem;
    if (!isTraceable(comp)) return alert('Comp is not set up for auto-trace.');
    var slayer = createShapeLayerFromAlpha(comp);
    setShapeLayerParameters(slayer);
    return true;
}

function autoTraceAll (){
    // store active comp
    //dlg.active = false;
    var activeComp = app.project.activeItem;
    var traceComps = getTraceableComps();
    for (c=0; c<traceComps.length; c++){
        autoTrace(traceComps[c]);
    }
    // restore active comp
    try {
        activeComp.openInViewer();
    } catch(e) {}
    return true;
}

function setupCompForAutoTrace (){
    var comp = app.project.activeItem;
    if (!comp){
        alert('There is no comp active in your viewer. Cancelling ...');
        return undefined;
    }

    var layer = comp.selectedLayers;
    if (layer.length !== 1) {
        alert('Select one layer (a precomp) to setup for tracing ...');
        return undefined;
    }

    var bin = getItem('Auto-Trace', FolderItem);
    var dlg = Window.confirm("""Preparing this comp for auto-tracing ...\
        This command will:\
        - Rename the selected layer\
        - Move the active comp to the 'Auto-trace'\
          folder in your project bin\
        - Create a 'Trace Params' null in this comp.\
        \
        Make sure you have a precomp selected!\
        Do you wish to proceed?""");
    if (!dlg) return undefined;

    layer = layer[0];
    if (!(layer.source instanceof CompItem)){
        alert('This command should only be run with a precomp selected ...');
        return undefined;
    }

    layer.name = '@TRACETHIS';
    if (!bin) bin = addAutoTraceProjectBin();
    comp.parentFolder = bin;
    addTraceParamsLayer ();
    return true;
}

function projectReport (){
    var res = "The following comps are ready for Auto-trace:\n";
    var comps = getTraceableComps();
    for (c in comps){
        res += comps[c].name + "\n";
    }
    return (alert(res));
}

function isTraceable (comp, silent){
    silent = silent || false;
    function sub(comp){
        if (!comp instanceof CompItem) return 1;
        if (!comp.layer("Trace Params")) return 2;
        if (!comp.layer("@TRACETHIS")) return 3;
        return -1;
    }
    var res = {
        1: 'Auto-trace is only setup to work on comps.',
        2: 'No \'Trace Parameters\' layer found.',
        3: 'No \'@TRACETHIS\' layer found.'
    };
    var idx = sub(comp);
    if (idx == -1)
        return true;
    else { 
        if (!silent) alert (res[idx]);
        return false;
    }
}

function getTraceableComps (){
    var comps = new Array();
    var strokeFolder = getItem('Auto-Trace', FolderItem);
    if (strokeFolder){
        for (c=1; c<=strokeFolder.numItems; c++) {
            var tempComp = strokeFolder.item(c);
            if (!isTraceable(tempComp, silent=true))
                continue;
            comps.push(tempComp);
        }
    } return comps;
}

function scrubAutomatedLayers (comp){
    var scrubLayers = new Array();
    for (i=1; i<=comp.layers.length; i++){
        if (comp.layer(i).name.indexOf('!Auto-traced') > -1){
            scrubLayers.push(comp.layer(i));
        }
    }
    if (scrubLayers.length) {
        for (L in scrubLayers){
            if (!scrubLayers.hasOwnProperty(L)) continue;
            scrubLayers[L].remove();
        }
    }
    return comp;
}

function createShapeLayerFromAlpha (comp) {
    comp.openInViewer();
    app.executeCommand(2004); // Deselect all...
    var comp = scrubAutomatedLayers(comp);
    var alphaLayer = comp.layer('@TRACETHIS');
    if (!alphaLayer) { alert('No traceable layer found! Cancelling...'); return false; }
    /* masksLayer (LayerItem)
    ** The layer generated by the Auto-trace command. This returns undefined, but does select the layer
    */
    var masksLayer = autoTraceLayer(alphaLayer);
    //masksLayer.name = "!AUTO " + alphaLayer.name + " Mask Layer";
    //masksLayer.moveBefore(alphaLayer);
    var masksGroup = masksLayer.property("ADBE Mask Parade");

    /* shapeLayer (LayerItem)
    ** The code below is cribbed almost 100% from XXXXXXXXXX.
    */        
    var shapeLayer = comp.layers.addShape();
    var suffix = " Shapes";
    shapeLayer.name =  "!Auto-traced Shape Layer";
    //shapeLayer.moveBefore(masksLayer);

    var shapeLayerContents = shapeLayer.property("ADBE Root Vectors Group");
    var shapeGroup = shapeLayerContents; //.addProperty("ADBE Vector Group");
    //shapeGroup.name = "Masks";
    shapePathGroup, shapePath, shapePathData;

    // Get the mask layer's pixel aspect; if layer has no source, use comp's pixel aspect
    var pixelAspect = (masksLayer.source !== null) ? masksLayer.source.pixelAspect : 1.0; //comp.pixelAspect;

    // Iterate over the masks layer's masks, converting their paths to shape paths
    var mask, maskPath, vertices;
    for (m=1; m<=masksGroup.numProperties; m++)
    {
        // Get mask info
        var mask = masksGroup.property(m);
        var maskPath = mask.property("ADBE Mask Shape");

        // Create new shape path using mask info
        var shapePathGroup = shapeGroup.addProperty("ADBE Vector Shape - Group");
        shapePathGroup.name = mask.name;
        var shapePath = shapePathGroup.property("ADBE Vector Shape");

        var shapePathData = new Shape();

        // ...adjust mask vertices (x axis) by pixel aspect
        var vertices = new Array();
        for (var v=0; v<maskPath.value.vertices.length; v++)
            vertices[vertices.length] = [maskPath.value.vertices[v][0] * pixelAspect, maskPath.value.vertices[v][1]];
        shapePathData.vertices = vertices;

        shapePathData.inTangents = maskPath.value.inTangents;
        shapePathData.outTangents = maskPath.value.outTangents;
        shapePathData.closed = maskPath.value.closed;
        shapePath.setValue(shapePathData);
    }

    // Match the mask layer's transforms
    shapeLayer.transform.anchorPoint.setValue(masksLayer.transform.anchorPoint.value);
    shapeLayer.transform.position.setValue(masksLayer.transform.position.value);
    shapeLayer.transform.scale.setValue(masksLayer.transform.scale.value);
    if (masksLayer.threeDLayer)
    {
        shapeLayer.threeDLayer = true;
        shapeLayer.transform.xRotation.setValue(masksLayer.transform.xRotation.value);
        shapeLayer.transform.yRotation.setValue(masksLayer.transform.yRotation.value);
        shapeLayer.transform.zRotation.setValue(masksLayer.transform.zRotation.value);
        shapeLayer.transform.orientation.setValue(masksLayer.transform.orientation.value);
    }
    else
    {
        shapeLayer.transform.rotation.setValue(masksLayer.transform.rotation.value);
    }
    shapeLayer.transform.opacity.setValue(masksLayer.transform.opacity.value);

    masksLayer.remove();
    return shapeLayer;
}

function autoTraceLayer (alphaLayer){
    var autoMouseExe = new File("~/clickAutoTrace.exe");
    alphaLayer.enabled = true;
    var thisComp = alphaLayer.containingComp;
    var tracedLayer = alphaLayer.duplicate();
    tracedLayer.selected = true;
    if (autoMouseExe.exist) autoMouseExe.execute();
    app.executeCommand(3044); // Auto-trace ...
    //alert(tracedLayer.name);
    //tracedLayer.moveBefore(alphaLayer);
    tracedLayer.name = "!Auto-traced Layer";
    alphaLayer.enabled = false;
    return tracedLayer;
}

function setShapeLayerParameters (shapeLayer) {
    // Add Shape layer effects
    var shapes = shapeLayer.property("Contents");
    var params = shapeLayer.containingComp.layer("Trace Params");
    if (!shapes || !params) return (alert('Could not find valid parameters for tracing.'));

    if (!shapes.property("Offset Paths 1")) shapes.addProperty("ADBE Vector Filter - Offset");
    if (!shapes.property("Merge Paths 1")) shapes.addProperty("ADBE Vector Filter - Merge");
    if (!shapes.property("Trim Paths 1")) shapes.addProperty("ADBE Vector Filter - Trim");
    if (!shapes.property("Stroke 1")) shapes.addProperty("ADBE Vector Graphic - Stroke");

    // Set user-defined parameters that can't be set by expression
    // 0: Target propertyGroup, 1: Target property, 2: source property
    var staticProperties = [
        ["Stroke 1", "Line Join", "Rounded Joints"],
        ["Offset Paths 1", "Line Join", "Rounded Joints"],
        ["Trim Paths 1", "Trim Multiple Shapes", "Individual Trace"],
        ["Merge Paths 1", "Mode", "Remove Holes"]
    ]  

    for (p in staticProperties){
        if (!staticProperties.hasOwnProperty(p)) continue;
        var props = staticProperties[p];
        var tarProp = shapes.property(props[0]).property(props[1]);
        var srcProp = params.property("Effects").property(props[2]);
        var value = srcProp.checkbox.value ? 2 : 1;
        tarProp.setValue(value);
    }

    // Set user-defined paramaters that are keyable, and set by expression links
    // 0: Target propertyGroup, 1: Target property, 2: source property
    var expressionLinkedProperties = [
        ["Stroke 1", "Stroke Width", "Stroke Width"],
        ["Offset Paths 1", "Amount", "Stroke Offset"],
        ["Offset Paths 1", "Miter Limit", "Miter Limit"],
        ["Trim Paths 1", "Start", "Trim Start"],
        ["Trim Paths 1", "End", "Trim End"],
        ["Trim Paths 1", "Offset", "Trim Offset"]
    ];

    for (p in expressionLinkedProperties){
        if (!expressionLinkedProperties.hasOwnProperty(p)) continue;
        var props = expressionLinkedProperties[p];
        var tarProp = shapes.property(props[0]).property(props[1]);
        var exp = 'thisComp.layer("Trace Params").effect("' + props[2] + '")("Slider")';
        if (tarProp.canSetExpression){
            tarProp.expression = exp;
            tarProp.expressionEnabled = true;
        }
    }

}

function addAutoTraceProjectBin (){
    var bin = getItem('Auto-Trace', FolderItem);
    if (!bin) bin = app.project.items.addFolder("Auto-Trace")
    return bin;
}

function addTraceParamsLayer (){
    var comp = app.project.activeItem;

    if (comp === undefined) {
        alert("No comp is active in the viewer. Can't add Trace Params layer ...");
        return false;
    }
    if (comp.layer("Trace Params")){
        return undefined;
    }

    var layer = comp.layers.addNull();
    layer.name = "Trace Params";

    var widthSlider = layer.property("Effects").addProperty("Slider Control");
    widthSlider.name = "Stroke Width";
    widthSlider.slider.setValue(1.0);
    var offsetSlider = layer.property("Effects").addProperty("Slider Control");
    offsetSlider.name = "Stroke Offset";
    offsetSlider.slider.setValue(0);
    var miterSlider = layer.property("Effects").addProperty("Slider Control");
    miterSlider.name = "Miter Limit";
    miterSlider.slider.setValue(1.0);
    var roundedToggle = layer.property("Effects").addProperty("Checkbox Control");
    roundedToggle.name = "Rounded Joints";
    var indivToggle = layer.property("Effects").addProperty("Checkbox Control");
    indivToggle.name = "Individual Trace";
    var addMergeToggle = layer.property("Effects").addProperty("Checkbox Control");
    addMergeToggle.name = "Remove Holes";

    var trimStartSlider = layer.property("Effects").addProperty("Slider Control");
    trimStartSlider.name = "Trim Start";
    trimStartSlider.slider.setValue(0);
    var trimEndSlider = layer.property("Effects").addProperty("Slider Control");
    trimEndSlider.name = "Trim End";
    trimEndSlider.slider.setValue(100);
    var trimOffsetSlider = layer.property("Effects").addProperty("Slider Control");
    trimOffsetSlider.name = "Trim Offset";

    return layer;
}
    