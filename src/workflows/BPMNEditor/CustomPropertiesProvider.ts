import { SelectEntry, isSelectEntryEdited } from '@bpmn-io/properties-panel';

const TASKS_TYPES = ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:SendTask', 'bpmn:ReceiveTask', 'bpmn:ManualTask', 'bpmn:BusinessRuleTask', 'bpmn:ScriptTask'];
const EVENTS_TYPES = ['bpmn:StartEvent', 'bpmn:IntermediateCatchEvent', 'bpmn:IntermediateThrowEvent', 'bpmn:EndEvent', 'bpmn:BoundaryEvent'];
const GATEWAY_TYPES = ['bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:InclusiveGateway', 'bpmn:EventBasedGateway', 'bpmn:ComplexGateway'];
const SUB_PROCESS_TYPES = ['bpmn:SubProcess', 'bpmn:Transaction', 'bpmn:AdHocSubProcess'];
const CALL_ACTIVITIES_TYPES = ['bpmn:CallActivity'];
const DATA_REF_TYPES = ['bpmn:DataObjectReference', 'bpmn:DataStoreReference'];
const ARTIFACTS_TYPES = ['bpmn:TextAnnotation', 'bpmn:Group'];
const CONNECTIONS_TYPES = ['bpmn:SequenceFlow', 'bpmn:MessageFlow', 'bpmn:Association', 'bpmn:DataInputAssociation', 'bpmn:DataOutputAssociation'];
const POOLS_LINES_TYPES = ['bpmn:Participant', 'bpmn:Lane'];
const COLLABORATIONS_TYPES = ['bpmn:Collaboration','bpmn:Process']

class CustomPropertiesProvider {
    static $inject = ['propertiesPanel', 'translate'];

    _translate: any;

    constructor(propertiesPanel: any, translate: any) {
        propertiesPanel.registerProvider(500, this);
        this._translate = translate;
    }

    getGroups(element: any) {

        function ActivityCustomGroup(element: any, translate: any) {

            function FormSelector(props: any) {
                // Define your available forms here
                const AVAILABLE_FORMS = [
                    { label: 'User Registration Form', value: 'user-registration' },
                    { label: 'Contact Form', value: 'contact-form' },
                    { label: 'Survey Form', value: 'survey-form' },
                    { label: 'Feedback Form', value: 'feedback-form' },
                ];
                const { element, id } = props;
                const modeling = props.modeling || props.commandStack;
                const translate = props.translate || ((s: string) => s);

                const getValue = () => {
                    return element.businessObject.formId || '';
                };

                const setValue = (value: string) => {
                    modeling.updateProperties(element, {
                        formId: value,
                    });
                };

                return SelectEntry({
                    element,
                    id: id + '-formSelector',
                    label: translate('Select Form'),
                    getValue,
                    setValue,
                    getOptions: () => [
                        { label: '-- No Form --', value: '' },
                        ...AVAILABLE_FORMS,
                    ],
                });
            }

            return {
                id: 'custom',
                label: translate('Custom Properties'),
                entries: [
                    {
                        id: 'formSelector',
                        element,
                        component: FormSelector,
                        isEdited: isSelectEntryEdited,
                    },
                ],
            };
        };

        return (groups: any[]) => {
            if (TASKS_TYPES.includes(element.type)) {
                groups.push(ActivityCustomGroup(element, this._translate));
            }

            return groups;
        };
    }
}

export default {
    __init__: ['customPropertiesProvider'],
    customPropertiesProvider: ['type', CustomPropertiesProvider],
};
