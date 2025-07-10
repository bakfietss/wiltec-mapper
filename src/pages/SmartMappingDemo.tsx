import React, { useState } from 'react';
import { SmartMappingSuggestions } from '../components/nodes/SmartMappingSuggestions';
import { SmartMappingAnalyzer } from '../services/SmartMappingAnalyzer';
import { XmlJsonConverter } from '../services/XmlJsonConverter';
import { SchemaField } from '../components/nodes/shared/FieldRenderer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';

export default function SmartMappingDemo() {
    const [sourceData, setSourceData] = useState<any[]>([]);
    const [targetFields, setTargetFields] = useState<SchemaField[]>([]);
    const [xmlInput, setXmlInput] = useState(`<person personid_extern="7726295" functionid_extern="5185" employmenttypeid_extern="FT" companyid_extern="PRAKTIJKINSTRUCTIEEMMEN" datestart="1978-09-01" genderid="M" firstname="Nanno" lastname="Brakels" middlename="" username="Nanno.Brakels@Teijinaramid.com" active="Y" authorised="Y" remarks="" email="Nanno.Brakels@Teijinaramid.com" isolanguage="nl-NL" startset_ordered="" reorder_startset_date="1978-09-01" use_custom_products="Y"/>`);
    const [targetXmlInput, setTargetXmlInput] = useState(`<employee>
    <id>123</id>
    <personalInfo>
        <firstName>John</firstName>
        <lastName>Doe</lastName>
        <email>john.doe@company.com</email>
        <gender>M</gender>
    </personalInfo>
    <employment>
        <startDate>2023-01-01</startDate>
        <status>active</status>
        <type>full-time</type>
        <company>TechCorp</company>
    </employment>
</employee>`);

    const processXmlSource = () => {
        try {
            const jsonData = XmlJsonConverter.xmlToJsonEnhanced(xmlInput);
            console.log('🎯 Source XML converted:', jsonData);
            
            // Extract the main data structure
            const rootKey = Object.keys(jsonData)[0];
            const rootData = jsonData[rootKey];
            const dataArray = Array.isArray(rootData) ? rootData : [rootData];
            
            setSourceData(dataArray);
        } catch (error) {
            console.error('❌ XML parsing failed:', error);
            alert(`XML parsing failed: ${error}`);
        }
    };

    const processXmlTarget = () => {
        try {
            const jsonData = XmlJsonConverter.xmlToJsonEnhanced(targetXmlInput);
            console.log('🎯 Target XML converted:', jsonData);
            
            // Extract and generate fields
            const rootKey = Object.keys(jsonData)[0];
            const rootData = jsonData[rootKey];
            const dataArray = Array.isArray(rootData) ? rootData : [rootData];
            
            const fields = generateFieldsFromXmlObject(dataArray[0]);
            setTargetFields(fields);
        } catch (error) {
            console.error('❌ Target XML parsing failed:', error);
            alert(`Target XML parsing failed: ${error}`);
        }
    };

    const generateFieldsFromXmlObject = (obj: any, parentPath = ''): SchemaField[] => {
        return Object.keys(obj).map((key, index) => {
            const value = obj[key];
            const fieldId = `field-${Date.now()}-${parentPath}-${index}`;
            
            // Handle XML attributes (keys starting with @)
            if (key.startsWith('@')) {
                return {
                    id: fieldId,
                    name: key,
                    type: 'string',
                    isAttribute: true
                };
            }
            
            // Handle XML text content
            if (key === '#text') {
                return {
                    id: fieldId,
                    name: 'text',
                    type: 'string'
                };
            }
            
            if (Array.isArray(value)) {
                return {
                    id: fieldId,
                    name: key,
                    type: 'array',
                    children: value.length > 0 && typeof value[0] === 'object' 
                        ? generateFieldsFromXmlObject(value[0], `${fieldId}-item`)
                        : []
                };
            } else if (value && typeof value === 'object') {
                return {
                    id: fieldId,
                    name: key,
                    type: 'object',
                    children: generateFieldsFromXmlObject(value, fieldId)
                };
            } else {
                return {
                    id: fieldId,
                    name: key,
                    type: typeof value === 'number' ? 'number' : 
                          typeof value === 'boolean' ? 'boolean' : 'string'
                };
            }
        });
    };

    const handleApplySuggestion = (suggestion: any) => {
        console.log('🔗 Applied suggestion:', suggestion);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">Smart XML Mapping Demo</h1>
                <p className="text-gray-600">Test the smart mapping analyzer with XML data</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source XML */}
                <Card>
                    <CardHeader>
                        <CardTitle>Source XML Data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={xmlInput}
                            onChange={(e) => setXmlInput(e.target.value)}
                            placeholder="Paste source XML here..."
                            className="h-32 font-mono text-sm"
                        />
                        <Button onClick={processXmlSource} className="w-full">
                            Parse Source XML
                        </Button>
                        {sourceData.length > 0 && (
                            <div className="bg-green-50 p-3 rounded border">
                                <p className="text-sm text-green-700 font-medium">
                                    ✅ Parsed {sourceData.length} source record(s)
                                </p>
                                <pre className="text-xs mt-2 text-green-600">
                                    {JSON.stringify(sourceData[0], null, 2).slice(0, 200)}...
                                </pre>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Target XML */}
                <Card>
                    <CardHeader>
                        <CardTitle>Target XML Schema</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            value={targetXmlInput}
                            onChange={(e) => setTargetXmlInput(e.target.value)}
                            placeholder="Paste target XML schema here..."
                            className="h-32 font-mono text-sm"
                        />
                        <Button onClick={processXmlTarget} className="w-full">
                            Parse Target Schema
                        </Button>
                        {targetFields.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded border">
                                <p className="text-sm text-blue-700 font-medium">
                                    ✅ Generated {targetFields.length} target field(s)
                                </p>
                                <div className="text-xs mt-2 space-y-1">
                                    {targetFields.map(field => (
                                        <div key={field.id} className="text-blue-600">
                                            • {field.name} ({field.type})
                                            {field.isAttribute && ' [attr]'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Smart Mapping Suggestions */}
            <SmartMappingSuggestions
                sourceData={sourceData}
                targetFields={targetFields}
                onApplySuggestion={handleApplySuggestion}
                className="max-w-4xl mx-auto"
            />

            {/* Debug Info */}
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Debug Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium mb-2">Source Data Structure:</h4>
                            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto h-32">
                                {JSON.stringify(sourceData, null, 2)}
                            </pre>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Target Fields:</h4>
                            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto h-32">
                                {JSON.stringify(targetFields, null, 2)}
                            </pre>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}