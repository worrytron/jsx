/**
 * AutoTrace
 * @summary A suite of automation and simplifying tools for creating shape layer outlines
 * from alpha channels. Used in the ESPN AfterEffects pipeline.
 *
 * @version 1.0
 * @author mark.rohrer@espn.com
 * @date 6/15/2017
 */

#target aftereffects

$.evalFile(((new File($.fileName)).parent).toString() + '/lib/aeCore.jsx');

/* Execution
**
*/

(function AutoTrace(thisObj)
{	
	var helpText1 = """Instructions:\n\
This tool is intended to be used as a part of a nested\
precomp. In order to trace an asset, first create a\
template precomp for that asset. Then nest that\
precomp into a new comp, open it, and run the 'Setup\
Comp' command. This will prepare that comp for\
auto-tracing. (You may name this comp however\
you like.)\
\
'Setup Comp' will rename your asset layer to\
'@TRACETHIS', tagging it for the script to auto-trace.\
It will then move your auto-traceable comp to a\
tagged folder in the project window. \
\
It will also create a null called 'Trace Params',\
containing the commonly-used stroke parameters.\
Any keyframes should be placed on these null\
parameters, not the shape layer itself. When the\
'Auto-trace' script is run, these values or\
keyframes will be applied to the resulting Shape\
Layer via expression links.\
\
Once the shape layer is created, you should be able\
to modify the keyframes on the 'Trace Params' layer\
and see the results on screen. A few dropdown-based\
parameters cannot be modified via expression links,\
and so are only applied when the shape layer is\
created. (These params are set via checkboxes).\
\
Tracing the 'Auto-Trace Folder' will trace every\
prepared comp in the project. This is used when\
you globally swap out assets and want to update\
the strokes accordingly. 'Active Comp Only' is\
used primarily during look development.\
\
'Project Report' will print a list of all comps\
that are currently ready to be auto-traced.\
\
Do not rename the '@TRACETHIS' or 'Trace Params'\
layers, or move auto-traceable comps out of the\
'Auto-trace' project bin, or else the script\
will fail.""";

	function AutoTraceUI(thisObj)
	{
		var onWindows = ($.os.indexOf("Windows") !== -1);
		var pal = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Auto Trace", undefined, {resizeable:true});

		if (pal !== null)
			{
				var res =
				"""group { 
					orientation:'column', alignment:['fill','fill'],
					box1: Group {
						alignment:['fill', 'top'], orientation:'column', alignChildren:['fill','top'],
						heading: StaticText { text:'Trace Alpha', alignment:['fill','top'] },
						traceBtn: Button { text: 'Active Comp Only', preferredSize:[-1,20] },
						traceAllBtn: Button { text: 'Auto-trace Folder', preferredSize:[-1,20] },
					},
					box2: Group {
						alignment:['fill', 'top'], orientation:'column', alignChildren:['fill','top'],
						heading: StaticText { text:'Setup / Help', alignment:['fill','top'] },
						setupBtn: Button { text:'Setup Comp', preferredSize:[-1,20] },
						checkBtn: Button { text:'Check Project', preferredSize:[-1,20] },
						helpBtn: Button { text:'Help', preferredSize:[-1,20] }
					}
				}""";
				pal.grp = pal.add(res);
				
				pal.grp.box2.margins.top = 10;
				//pal.grp.compbox.lst.preferredSize.height = 100;
				
				pal.layout.layout(true);
				pal.grp.minimumSize = pal.grp.size;
				pal.layout.resize();
				pal.onResizing = pal.onResize = function () {this.layout.resize();}
				
				pal.grp.box1.traceBtn.onClick = function() {
                    try {
                        autoTrace();
                    } catch(e) { alert(e.message); }
                };
				pal.grp.box1.traceAllBtn.onClick = autoTraceAll;
				pal.grp.box2.checkBtn.onClick = projectReport;
				pal.grp.box2.setupBtn.onClick = setupCompForAutoTrace;

				pal.grp.box2.helpBtn.onClick = function () { alert(helpText1); }
				
			}
		return pal;
	}

	var dlg = AutoTraceUI(thisObj);
	if ((dlg !== null) && (dlg instanceof Window))
	{
        dlg.center();
        dlg.show();
	} 
    else
        dlg.layout.layout(true);

})(this);