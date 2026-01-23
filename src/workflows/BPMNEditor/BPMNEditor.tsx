import { useRef, useEffect } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule} from 'bpmn-js-properties-panel';
import CustomPropertiesProvider from './CustomPropertiesProvider';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

// Initial empty BPMN diagram
const initialBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
    <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                      xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                      xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                      id="Definitions_1"
                      targetNamespace="http://bpmn.io/schema/bpmn">
      <bpmn:process id="Process_1" isExecutable="false">
        <bpmn:startEvent id="StartEvent_1"/>
      </bpmn:process>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
          <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
            <dc:Bounds x="173" y="102" width="36" height="36"/>
          </bpmndi:BPMNShape>
        </bpmndi:BPMNPlane>
      </bpmndi:BPMNDiagram>
    </bpmn:definitions>`;

function BpmnEditor() {
    const containerRef = useRef<HTMLDivElement>(null);
    const propertiesPanelRef = useRef<HTMLDivElement>(null);
    const bpmnModeler = useRef<BpmnModeler | null>(null); // Use a ref to store the modeler instance

    useEffect(() => {
        if (containerRef.current && propertiesPanelRef.current) {
            bpmnModeler.current = new BpmnModeler({
                container: containerRef.current,
                propertiesPanel: {
                    parent: propertiesPanelRef.current,
                },
                additionalModules: [
                    BpmnPropertiesPanelModule,
                    BpmnPropertiesProviderModule,
                    CustomPropertiesProvider,
                ],
            });

            // Load the initial BPMN diagram
            bpmnModeler.current.importXML(initialBpmnXml);
        }

        return () => {
            // Clean up the modeler when the component unmounts
            if (bpmnModeler.current) {
                bpmnModeler.current.destroy();
            }
        };
    }, []); // Empty dependency array ensures this runs once on mount

    // You can add functions to interact with the modeler here,
    // such as saving the diagram, importing XML, etc.
    const saveDiagram = async () => {
        if (bpmnModeler.current) {
            const { xml } = await bpmnModeler.current.saveXML({ format: true });
            console.log('BPMN XML:', xml);
            // You can then send this XML to a server or process it further
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div ref={containerRef} style={{ flex: 1 }}></div>
                <div
                    ref={propertiesPanelRef}
                    style={{
                        width: '300px',
                        borderLeft: '1px solid #ccc',
                        overflow: 'auto',
                        background: 'white'
                    }}
                ></div>
            </div>
            <div style={{ padding: '10px', borderTop: '1px solid #ccc', background: 'white' }}>
                <button onClick={saveDiagram}>Save Diagram</button>
            </div>
        </div>
    );
}

export default BpmnEditor;