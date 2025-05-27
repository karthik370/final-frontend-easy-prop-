import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { SERVER_URL, ENDPOINTS } from '../config/api';

/**
 * ApiTester component for testing API endpoints during development
 * This is a developer tool and should not be included in production builds
 */
const ApiTester = () => {
  const { userToken } = useContext(AuthContext);
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState('GET');
  const [requestBody, setRequestBody] = useState('');
  const [queryParams, setQueryParams] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useAuth, setUseAuth] = useState(true);
  const [endpointList, setEndpointList] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    endpoints: false,
    request: true,
    response: true,
  });

  // Initialize endpoint list from config
  useEffect(() => {
    const endpoints = [];
    
    // Process the ENDPOINTS object to get all endpoints
    Object.entries(ENDPOINTS).forEach(([key, value]) => {
      if (typeof value === 'string') {
        endpoints.push({ name: key, path: value, method: 'GET' });
      } else if (typeof value === 'function') {
        // Function endpoints have parameters, add with sample param
        endpoints.push({ name: key, path: value('123'), method: 'GET', hasParam: true });
      }
    });
    
    setEndpointList(endpoints);
  }, []);

  const toggleExpandSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleEndpointSelect = (endpointObj) => {
    setEndpoint(endpointObj.path);
    
    // Set appropriate method based on endpoint naming convention
    const name = endpointObj.name.toLowerCase();
    if (name.includes('create') || name.includes('add')) {
      setMethod('POST');
    } else if (name.includes('update') || name.includes('edit')) {
      setMethod('PUT');
    } else if (name.includes('delete') || name.includes('remove')) {
      setMethod('DELETE');
    } else {
      setMethod('GET');
    }
    
    // Reset other fields
    setRequestBody('');
    setQueryParams('');
    setResponse(null);
    setError(null);
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      // Prepare full URL with query parameters
      let url = `${SERVER_URL}${endpoint}`;
      if (queryParams.trim()) {
        // Parse query params string into object
        const params = {};
        queryParams.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            params[key.trim()] = value.trim();
          }
        });
        
        // Add query params to URL
        const queryString = new URLSearchParams(params).toString();
        url = `${url}?${queryString}`;
      }
      
      // Prepare request config
      const config = {
        headers: {},
      };
      
      // Add auth token if enabled
      if (useAuth && userToken) {
        config.headers['Authorization'] = `Bearer ${userToken}`;
      }
      
      // Parse request body if provided and method is not GET
      let data = {};
      if (method !== 'GET' && requestBody.trim()) {
        try {
          data = JSON.parse(requestBody);
        } catch (e) {
          setError('Invalid JSON in request body');
          setIsLoading(false);
          return;
        }
      }
      
      // Send the request
      let result;
      switch (method) {
        case 'GET':
          result = await axios.get(url, config);
          break;
        case 'POST':
          result = await axios.post(url, data, config);
          break;
        case 'PUT':
          result = await axios.put(url, data, config);
          break;
        case 'DELETE':
          result = await axios.delete(url, config);
          break;
        default:
          result = await axios.get(url, config);
      }
      
      setResponse(result.data);
    } catch (err) {
      console.error('API request error:', err);
      setError({
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const SectionHeader = ({ title, isExpanded, onToggle }) => (
    <TouchableOpacity 
      style={styles.sectionHeader} 
      onPress={onToggle}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons 
        name={isExpanded ? 'chevron-up' : 'chevron-down'} 
        size={20} 
        color="#333" 
      />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>API Tester</Text>
        <Text style={styles.headerSubtitle}>Development Tool</Text>
      </View>
      
      {/* Endpoints Section */}
      <SectionHeader 
        title="Available Endpoints" 
        isExpanded={expandedSections.endpoints} 
        onToggle={() => toggleExpandSection('endpoints')} 
      />
      
      {expandedSections.endpoints && (
        <ScrollView 
          horizontal 
          style={styles.endpointListContainer}
          showsHorizontalScrollIndicator={false}
        >
          {endpointList.map((endpointObj, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.endpointItem}
              onPress={() => handleEndpointSelect(endpointObj)}
            >
              <Text style={styles.endpointName}>{endpointObj.name}</Text>
              <Text 
                style={styles.endpointPath}
                numberOfLines={1}
              >
                {endpointObj.path}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      {/* Request Section */}
      <SectionHeader 
        title="Request" 
        isExpanded={expandedSections.request} 
        onToggle={() => toggleExpandSection('request')} 
      />
      
      {expandedSections.request && (
        <View style={styles.requestContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endpoint</Text>
            <TextInput
              style={styles.input}
              value={endpoint}
              onChangeText={setEndpoint}
              placeholder="/api/endpoint"
            />
          </View>
          
          <View style={styles.methodContainer}>
            {['GET', 'POST', 'PUT', 'DELETE'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.methodButton,
                  method === m && styles.methodButtonActive,
                ]}
                onPress={() => setMethod(m)}
              >
                <Text 
                  style={[
                    styles.methodButtonText,
                    method === m && styles.methodButtonTextActive,
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Query Parameters</Text>
            <TextInput
              style={styles.input}
              value={queryParams}
              onChangeText={setQueryParams}
              placeholder="param1=value1&param2=value2"
            />
          </View>
          
          {method !== 'GET' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Request Body (JSON)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={requestBody}
                onChangeText={setRequestBody}
                placeholder='{\n  "key": "value"\n}'
                multiline
                numberOfLines={4}
              />
            </View>
          )}
          
          <View style={styles.authContainer}>
            <Text style={styles.label}>Use Authentication</Text>
            <Switch
              value={useAuth}
              onValueChange={setUseAuth}
              trackColor={{ false: '#ddd', true: '#a3d3ff' }}
              thumbColor={useAuth ? '#0066cc' : '#f4f3f4'}
            />
          </View>
          
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendRequest}
            disabled={isLoading || !endpoint}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send Request</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* Response Section */}
      <SectionHeader 
        title="Response" 
        isExpanded={expandedSections.response} 
        onToggle={() => toggleExpandSection('response')} 
      />
      
      {expandedSections.response && (
        <View style={styles.responseContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066cc" />
              <Text style={styles.loadingText}>Sending request...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Error</Text>
              {error.status && (
                <Text style={styles.errorStatus}>Status: {error.status}</Text>
              )}
              <Text style={styles.errorMessage}>{error.message}</Text>
              {error.data && (
                <View style={styles.responseDataContainer}>
                  <Text style={styles.responseLabel}>Response Data:</Text>
                  <Text style={styles.responseData}>
                    {JSON.stringify(error.data, null, 2)}
                  </Text>
                </View>
              )}
            </View>
          ) : response ? (
            <View style={styles.successContainer}>
              <Text style={styles.successTitle}>Success</Text>
              <View style={styles.responseDataContainer}>
                <Text style={styles.responseLabel}>Response Data:</Text>
                <Text style={styles.responseData}>
                  {JSON.stringify(response, null, 2)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noResponseText}>No response yet</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#0066cc',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ddd',
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  endpointListContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  endpointItem: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginRight: 10,
    width: 150,
  },
  endpointName: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  endpointPath: {
    fontSize: 12,
    color: '#666',
  },
  requestContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  methodContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  methodButton: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginRight: 5,
    borderRadius: 5,
  },
  methodButtonActive: {
    backgroundColor: '#0066cc',
  },
  methodButtonText: {
    fontWeight: 'bold',
    color: '#666',
  },
  methodButtonTextActive: {
    color: '#fff',
  },
  authContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sendButton: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  responseContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 200,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  noResponseText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  errorContainer: {
    padding: 15,
    backgroundColor: '#ffeeee',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6666',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#cc0000',
    marginBottom: 5,
  },
  errorStatus: {
    fontSize: 14,
    color: '#cc0000',
    marginBottom: 5,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  successContainer: {
    padding: 15,
    backgroundColor: '#eeffee',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#66cc66',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00cc00',
    marginBottom: 10,
  },
  responseDataContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  responseData: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
});

export default ApiTester;
