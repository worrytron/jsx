group { 
    orientation:'column', alignment:['fill','fill'], alignChildren:['fill','top'], size:[-1,-1],
    tabs: Panel { text:'', type:'tabbedpanel', alignment:['fill','top'], orientation:'column', alignChildren:['fill','top'], size:[-1,-1],
        setup: Panel { type:'tab', text:'Setup', alignment:['fill', 'top'], alignChildren:['fill','top'], margins:[15,10,0,-1], size:[-1,-1],
            production: Group {
                orientation:'row',
                heading: StaticText { text: 'Production:', alignment:['left','top'], preferredSize:[85,20] },
                dd: DropDownList { alignment: ['fill','top'], preferredSize:[-1,20] }
            },
            projectName: Group {
                orientation:'stacked', alignChildren:['fill','top'],
                pick: Group { 
                    orientation:'row',
                    heading: StaticText { text: 'Select folder:', alignment:['left','top'], preferredSize:[85,20] },
                    dd: DropDownList { alignment:['fill','top'], preferredSize:[-1,20] }
                },
                edit: Group { 
                    orientation:'row',
                    heading: StaticText { text: 'Create folder:', alignment:['left','top'], preferredSize:[85,20] },
                    e: EditText { alignment:['fill','top'], preferredSize:[-1,20] }
                },
            }
            useExisting: Group {
                orientation:'row',
                heading: StaticText { text: '', alignment:['left','top'], preferredSize:[85,20] },
                cb: Checkbox { text: 'Use existing project folder' },                            
            },
            sceneName: Group {
                orientation:'row',
                heading: StaticText { text: 'Scene (optional):', alignment:['left','top'], preferredSize:[85,20] },
                e: EditText { alignment:['fill','top'], preferredSize:[-1,20] }
            },
            separator: Panel { alignment:['fill','top'], preferredSize:[-1,0] },
            createProject: Button { text: 'Create / Rename Project', alignment:['fill','top'] },
            buildLbl: StaticText { text: 'Build Template:', alignment:['left','top'] },
            build: Group {
                orientation: 'row', preferredSize:[-1,-1], alignment:['fill','top'], alignChildren:['fill','top'],
                createTemplate: Button { text: 'Online (CAGE)', alignment:['fill','top'] },
                createOfflineTemplate: Button { text: 'Offline (Edit)', alignment:['fill','top'] }
            },
            versionText: StaticText { text: 'v0.0.0', alignment:['right','bottom'] },
            updateUI: Button { text: 'Refresh UI', alignment:['fill','bottom'] }
        },
        version: Panel { type: 'tab', text:'Version', alignChildren:['fill','top'],  margins:[15,10,0,-1],
            div: Group {
                orientation: 'row',
                fields: Group {
                    orientation: 'column', preferredSize:[-1,-1], alignment:['fill','top'], alignChildren:['fill','top'],
                    team: Group {
                        orientation: 'row',
                        heading: StaticText { text:'Home:', alignment:['left','top'], preferredSize:[40, 20] },
                        dd: DropDownList { alignment:['fill','top'], preferredSize:[-1, 20] }
                    },
                    away: Group {
                        orientation: 'row',
                        heading: StaticText { text:'Away:', alignment:['left','top'], preferredSize:[40, 20] },
                        dd: DropDownList { alignment:['fill','top'], preferredSize:[-1, 20] }
                    },
                    shows: Group {
                        orientation: 'row',
                        heading: StaticText { text:'Show:', alignment:['left','top'], preferredSize:[40, 20] },
                        dd: DropDownList { alignment:['fill','top'], preferredSize:[-1, 20] }
                    },
                    customA: Group {
                        orientation: 'row',
                        heading: StaticText { text:'Text A:', alignment:['left','top'], preferredSize:[40, 20] },
                        et: EditText { text: 'Custom Text A', alignment:['fill', 'center'] }
                    },
                    customB: Group {
                        orientation: 'row',
                        heading: StaticText { text:'Text B:', alignment:['left','top'], preferredSize:[40, 20] },
                        et: EditText { text: 'Custom Text B', alignment:['fill', 'center'] }
                    },
                    customC: Group {
                        orientation: 'row',
                        heading: StaticText { text:'Text C:', alignment:['left','top'], preferredSize:[40, 20] },
                        et: EditText { text: 'Custom Text C', alignment:['fill', 'center'] }
                    },
                    customD: Group {
                        orientation: 'row',
                        heading: StaticText { text:'Text D:', alignment:['left','top'], preferredSize:[40, 20] },
                        et: EditText { text: 'Custom Text D', alignment:['fill', 'center'] }
                    },
                },
                checks: Group {
                    orientation: 'column', preferredSize:[15,-1], alignment:['right','center'],
                    cbT: Checkbox { alignment:['right','center'], size:[15,23] },
                    cbX: Checkbox { alignment:['right','center'], size:[15,23] },
                    cbS: Checkbox { alignment:['right','center'], size:[15,23] },
                    cbA: Checkbox { alignment:['right','center'], size:[15,23] },
                    cbB: Checkbox { alignment:['right','center'], size:[15,23] },
                    cbC: Checkbox { alignment:['right','center'], size:[15,23] },
                    cbD: Checkbox { alignment:['right','center'], size:[15,23] }
                }
            },
            separator: Panel { alignment:['fill','center'], preferredSize:[-1,0] },
            queue: Group {
                orientation:'row', alignChildren:['fill','top'],
                t: StaticText { text:'Add to queue:', alignment:['left','top'], preferredSize:[75, 20] },
                addFinal: Button { text:'Final', alignment:['fill','top'], preferredSize:[-1,20] },
                addWip: Button { text: 'WIP', alignment:['fill','top'], preferredSize:[-1,20] }
            }
            save: Button { text: 'Save Project', preferredSize:[-1,20] },
            bat: Group {
                orientation:'row', alignChildren:['fill','top'],
                addToBat: Button { text:'Add Project to .BAT', alignment:['fill','top'], preferredSize:[-1,20] },
                checkBat: Button { text: '?', size:[20,20] },
                clearBat: Button { text: 'X', size:[20,20] },
                runBat: Button { text: 'Run', size:[20,20] },
            }
        },
        toolkit: Panel { type:'tab', text:'Toolkit', alignment:['fill', 'top'], alignChildren:['fill','top'],  margins:[15,10,0,-1],
            heading: StaticText { text:'Expressions', alignment:['fill','top'] },
            expPick: DropDownList {},
            expAdd: Button { text: 'Add to Selected Property', preferredSize:[-1,20] },
            expClr: Button { text: 'Clear Selected Property', preferredSize:[-1,20] },
            separator: Panel { type:'panel', alignment:['fill','top'], preferredSize:[-1,0] },
            heading: StaticText { text:'Run these commands when changing:', alignment:['fill','top'] },
            teamScript: Group {
                orientation:'row',
                lbl: StaticText { text:'Team:', alignment:['left','top'], preferredSize:[40, 20] },
                et: EditText { text: '', alignment:['fill','center'], preferredSize:[-1, 20] },
            },
            awayScript: Group {
                orientation:'row',
                lbl: StaticText { text:'Away:', alignment:['left','top'], preferredSize:[40, 20] },
                et: EditText { text: '', alignment:['fill','center'], preferredSize:[-1, 20] },
            },
            showScript: Group {
                orientation:'row',
                lbl: StaticText { text:'Show:', alignment:['left','top'], preferredSize:[40, 20] },
                et: EditText { text: '', alignment:['fill','center'], preferredSize:[-1, 20] }
            },
            custScript: Group {
                orientation:'row',
                lbl: StaticText { text:'C.Text:', alignment:['left','top'], preferredSize:[40, 20] },
                et: EditText { text: '', alignment:['fill','center'], preferredSize:[-1, 20] }
            }
        },
        tdtools: Panel { type:'tab', text:'Batching', alignment:['fill','top'], alignChildren:['fill','top'], margins:[15,10,0,-1],
            batchAll: Button { text:'Batch All Teams', preferredSize:[-1,20] },
            batchSome: Button { text:'Batch List', preferredSize:[-1,20] },
            batchCust: Button { text:'Batch by Category', preferredSize:[-1,20] },
            separator: Panel { preferredSize:[-1,0] },
            pickleSheet: Button { text:'Pickle New Logosheet', alignment:['fill','bottom'], preferredSize:[-1,20] }
        }
    }
}