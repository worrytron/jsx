$.evalFile(((new File($.fileName)).parent).toString() + '/lib/aeCore.jsx');
$.evalFile(((new File($.fileName)).parent).toString() + '/lib/espnCore.jsx');

var report = "";

function renameComp(oldName){
    newName = "HOME " + oldName;
    try{
        var comp = getItem(oldName);
        comp.name = newName;
    } catch(e) {
        report += "· {0} not renamed.\n".format(oldName);
    }
}

// rename color swatch
renameComp("COLOR SWATCH");
// rename mascot outline
renameComp("MASCOT");
renameComp("MASCOT OUTLINE");
// rename primary logo
renameComp("PRIMARY LOGO");
// rename primary logo knockout
renameComp("PRIMARY LOGO KNOCKOUT");
// rename primary logo outline
renameComp("PRIMARY LOGO OUTLINE");
// rename secondary logo
renameComp("SECONDARY LOGO");
// rename secondary logo knockout
renameComp("SECONDARY LOGO OUTLINE");
// rename secondary logo outline
renameComp("SECONDARY LOGO KNOCKOUT");

// rename wordmark 1
renameComp("WORDMARK 1");
// rename wordmark 2
renameComp("WORDMARK 2");

// move team logosheet master switch to 1. toolkit precomps
try {
    var logoSheet = getItem("Team Logosheet Master Switch");
    logoSheet.parentFolder = getItem("1. TOOLKIT PRECOMPS", FolderItem);
} catch (e) {
     report += "· Could not move Team Logosheet Master Switch comp to 1. TOOLKIT PRECOMPS bin\n";
}

try {
    // remove "guides" bin
    var guidesBin = getItem("Guides", FolderItem);
    guidesBin.remove();
} catch (e) {
    report += "· Could not remove obsolete 'Guides' bin\n";
}

// get info from "system" text layers and apply that info to dashboard
// .. with user confirmation
try {
    var dash = getItem("0. Dashboard");

    if (dash) {
        var project = dash.layer("PROJECT");
        var scene = dash.layer("SCENE");
    }

    var scene = new SceneData("CBB", "ae");
    scene.setProject(project.text.sourceText.toString());
    scene.setName(scene.text.sourceText.toString());

    dash.comment = scene.getTag();
} catch (e) {
    report += "· Could not convert metadata tag to new pipeline. You will have to set this project up in the UI\n";
}

alert(report);

items = app.project.items;

// loop over all items 
for (var i=1; i<=items.length; i++){  
// skip anything that isn't a composition
    if (app.project.item(i).typeName !== "Composition") {
       continue;
    } else {
        var comp = app.project.item(i);
    }
    var layers_ = comp.layers;
    // loop over all layers in the current composition
    for (var j=1; j<=layers_.length; j++){
        // try to find a specific effect in that layer
        try {
          fx = layers_[j].effect("Fill");
          if (fx("Color").expression != "" && fx("Color").expressionEnabled){
              var old_exp = fx("Color").expression;
              if (old_exp.indexOf("HOME COLOR SWATCH") > -1)
                  continue;
              else if (old_exp.indexOf("COLOR SWATCH") === -1)
                  continue;
              else {
                //var new_exp = old_exp.split("\"COLOR SWATCH\"").join("\"HOME COLOR SWATCH\"");
                var new_exp = old_exp.replace("COLOR SWATCH", "HOME COLOR SWATCH");
                var conf = Window.confirm("Changing this expression:\n" + old_exp + "\nTo this:\n" + new_exp + "\n\nIs that cool?");
                if (!conf) continue;
                else
                    fx("Color").expression = new_exp;
              }
          }
          
        // skip any effects that don't match what we're looking for
        } catch(e) {
          continue;
        }
    }
}
