import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import { AuthContext } from '../context/AuthContext';

const ChatScreen = ({ route, navigation }) => {
  // Enhanced param extraction with detailed logging
  const params = route.params || {};
  const { 
    conversationId, 
    recipient: initialRecipient, 
    propertyId, 
    propertyTitle, 
    propertyImage,
    currentUserId 
  } = params;
  
  console.log('ChatScreen received params:', JSON.stringify(params, null, 2));
  console.log('Current user ID from params:', currentUserId);
  
  const { user, userToken } = useContext(AuthContext);
  console.log('Auth context user ID:', user?._id);
  
  // Get the effective user ID from multiple possible sources
  const effectiveUserId = useMemo(() => {
    return currentUserId || user?._id || (user?.user && user.user._id);
  }, [currentUserId, user]);
  
  console.log('Effective user ID:', effectiveUserId);
  
  // Check if we have the minimum required data
  if (!initialRecipient) {
    console.error('ChatScreen missing required recipient data');
  }
  
  const [messages, setMessages] = useState([]);
  const [recipient, setRecipient] = useState(initialRecipient);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [existingConversationId, setExistingConversationId] = useState(conversationId);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [isPropertyOwner, setIsPropertyOwner] = useState(false);
  const [allPropertyConversations, setAllPropertyConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [onRefresh, setOnRefresh] = useState(null);

  // Check if current user is the property owner
  useEffect(() => {
    if (propertyDetails) {
      // Get the current user ID from all possible sources
      const currentUserID = effectiveUserId;
      
      const ownerIsCurrentUser = (
        // Check if the current user is the property owner
        (currentUserID && propertyDetails.owner && propertyDetails.owner._id === currentUserID)
      );
      
      console.log('Property owner check:', { 
        isOwner: ownerIsCurrentUser,
        ownerId: propertyDetails.owner?._id,
        userId: user?._id,
        paramUserId: currentUserId,
        currentUserID,
        effectiveUserId,
        userObject: user ? 'exists' : 'null'
      });
      
      setIsPropertyOwner(ownerIsCurrentUser);
      
      // If user is property owner, fetch all conversations for this property
      if (ownerIsCurrentUser && userToken && propertyId) {
        console.log('Is property owner checking messages:', ownerIsCurrentUser);
        fetchAllPropertyConversations();
      }
    }
  }, [user, currentUserId, effectiveUserId, propertyDetails, userToken, propertyId]);

  // Immediately initialize when the component mounts
  useEffect(() => {
    // Ensure we have a valid token
    if (!userToken) {
      setIsLoading(false);
      return;
    }
    
    // Set up axios defaults for all requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
    
    // If we have an existing conversation, fetch messages
    if (existingConversationId) {
      fetchMessages();
    } else if (recipient && propertyId) {
      // Check for existing conversations
      checkExistingConversation();
    }
    
    // Always fetch property details
    fetchPropertyDetails();
    
    // Set up polling for new messages
    const interval = setInterval(() => {
      if (userToken && existingConversationId) {
        fetchNewMessages();
      }
    }, 5000);
    
    setPollingInterval(interval);
    
    // Set up refresh handler
    setOnRefresh(() => () => {
      setRefreshing(true);
      if (existingConversationId) {
        fetchMessages().finally(() => setRefreshing(false));
      } else if (isPropertyOwner) {
        fetchAllPropertyConversations().finally(() => setRefreshing(false));
      } else {
        setRefreshing(false);
      }
    });
    
    // Clean up on unmount
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userToken, existingConversationId, propertyId, recipient, isPropertyOwner]);

  // Fetch all conversations for a property (for property owner)
  const fetchAllPropertyConversations = async () => {
    if (!userToken || !propertyId) return;
    
    try {
      console.log(`Fetching all conversations for property: ${propertyId}`);
      const response = await axios.get(
        `${SERVER_URL}/api/messages/conversations`,
        {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        }
      );
      
      // Filter conversations for this property
      const propertyConversations = response.data.filter(
        conv => conv.propertyId === propertyId
      );
      
      console.log(`Found ${propertyConversations.length} conversations for property ${propertyId}`);
      
      if (propertyConversations.length > 0) {
        console.log('First conversation sample:', JSON.stringify(propertyConversations[0], null, 2));
      }
      
      // Process conversations to ensure they have all required data
      const processedConversations = propertyConversations.map(conv => {
        // Ensure otherUser is properly set
        let otherUser = conv.otherUser;
        
        // If otherUser is not set, try to find it in participants
        if (!otherUser && conv.participants && Array.isArray(conv.participants)) {
          otherUser = conv.participants.find(p => p._id !== effectiveUserId);
        }
        
        return {
          ...conv,
          otherUser: otherUser || { name: 'Unknown User' }
        };
      });
      
      setAllPropertyConversations(processedConversations);
      
      // Auto-select the first conversation if available
      if (processedConversations.length > 0 && !selectedConversation) {
        handleConversationSelect(processedConversations[0]);
      }
    } catch (error) {
      console.error('Error fetching property conversations:', error);
      Alert.alert(
        'Error',
        'Could not load property inquiries. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle conversation selection
  const handleConversationSelect = (conversation) => {
    if (!conversation || !conversation._id) {
      console.error('Invalid conversation selected');
      return;
    }
    
    console.log('Selected conversation:', JSON.stringify(conversation, null, 2));
    
    setSelectedConversation(conversation);
    setExistingConversationId(conversation._id);
    
    // Update recipient information
    if (conversation.otherUser && typeof conversation.otherUser === 'object') {
      console.log('Setting recipient to otherUser:', conversation.otherUser);
      setRecipient(conversation.otherUser);
    } else if (conversation.participants && Array.isArray(conversation.participants)) {
      // Try to find the other user in the participants array
      const otherParticipant = conversation.participants.find(
        p => p._id !== effectiveUserId
      );
      
      if (otherParticipant) {
        console.log('Setting recipient to participant:', otherParticipant);
        setRecipient(otherParticipant);
      } else {
        console.error('Could not find other participant in conversation');
      }
    } else {
      console.error('No recipient information found in conversation');
    }
    
    // Fetch messages for this conversation
    fetchMessages(conversation._id);
  };

  // Update header title when recipient name changes
  useEffect(() => {
    if (isPropertyOwner && selectedConversation) {
      navigation.setOptions({
        title: selectedConversation.otherUser?.name || 'Inquiries'
      });
    } else if (recipient && recipient.name) {
      navigation.setOptions({
        title: recipient.name || 'Chat'
      });
    }
  }, [recipient, isPropertyOwner, selectedConversation]);
  
  const flatListRef = useRef(null);

  useEffect(() => {
    // Set a timeout to clear loading state if it takes too long
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        console.log('Loading timeout reached, forcing UI update');
      }
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(loadingTimeout);
  }, [isLoading]);

  useEffect(() => {
    if (userToken && recipient && recipient._id && propertyId) {
      checkExistingConversation();
    }
  }, [userToken, recipient, propertyId]);

  const checkExistingConversation = async () => {
    // Ensure we have the minimum required data
    if (!userToken || !propertyId) {
      console.log('Missing required data for conversation check:', {
        hasToken: !!userToken,
        propertyId
      });
      return;
    }
    
    // Get recipient ID - handle both object and string cases
    let recipientId;
    if (typeof recipient === 'object' && recipient !== null) {
      recipientId = recipient._id;
    } else if (typeof recipient === 'string') {
      recipientId = recipient;
    }
    
    if (!recipientId) {
      console.log('Missing recipient ID for conversation check');
      return;
    }

    try {
      console.log('Checking for existing conversations with:', {
        propertyId,
        recipientId
      });
      
      // Get all conversations
      const response = await axios.get(`${SERVER_URL}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      console.log('Received conversations:', response.data.length);
      
      // Check if we're the property owner
      const isOwnerChecking = isPropertyOwner || 
                             (propertyDetails && 
                              propertyDetails.owner && 
                              propertyDetails.owner._id === effectiveUserId);
      
      console.log('Is property owner checking messages:', isOwnerChecking);
      
      // Find a matching conversation
      let foundConversation = null;
      
      for (const conv of response.data) {
        const convId = conv._id;
        const otherUserId = conv.otherUser?._id;
        const convPropertyId = conv.propertyId;
        
        const propertyMatch = convPropertyId === propertyId;
        
        // For property owners, we're looking for conversations about their property
        // For non-owners, we're looking for conversations with the property owner
        let userMatch = false;
        
        if (isOwnerChecking) {
          // If we're the owner, we want conversations with the recipient
          userMatch = otherUserId === recipientId;
        } else {
          // If we're not the owner, we want conversations with the property owner
          userMatch = otherUserId === recipientId;
        }
        
        console.log('Checking conversation:', {
          id: convId,
          otherUserId,
          propertyId: convPropertyId,
          propertyMatch,
          userMatch
        });
        
        if (propertyMatch && userMatch) {
          foundConversation = conv;
          break;
        }
      }
      
      if (foundConversation) {
        console.log('Found existing conversation:', foundConversation._id);
        setExistingConversationId(foundConversation._id);
        fetchMessages(foundConversation._id);
        
        // If we're the property owner, also select this conversation in the UI
        if (isPropertyOwner) {
          setSelectedConversation(foundConversation);
        }
      } else {
        console.log('No existing conversation found, will create one when sending first message');
      }
    } catch (error) {
      console.error('Error checking existing conversations:', error);
    }
  };

  // Add this utility function to ensure no duplicate message IDs
  const removeDuplicateMessages = (messagesList) => {
    const seen = new Map();
    return messagesList.filter(msg => {
      if (!msg._id) return true; // Keep messages without IDs (though there shouldn't be any)
      
      const duplicate = seen.has(msg._id);
      if (!duplicate) {
        seen.set(msg._id, true);
        return true;
      }
      console.log(`Filtered out duplicate message with ID: ${msg._id}`);
      return false;
    });
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId = existingConversationId) => {
    if (!userToken || !conversationId) {
      console.log('Cannot fetch messages - missing token or conversation ID');
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Fetching messages for conversation: ${conversationId}`);
      
      const response = await axios.get(
        `${SERVER_URL}/api/messages/conversations/${conversationId}`,
        {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        }
      );

      if (response.data && response.data.messages) {
        // Process messages to ensure no duplicates
        const uniqueMessages = removeDuplicateMessages(response.data.messages);
        setMessages(uniqueMessages);
        
        // Update conversation data if available
        if (response.data.conversation) {
          // If we're the property owner, find the other participant
          if (isPropertyOwner && response.data.conversation.participants) {
            const otherUserId = response.data.conversation.participants.find(
              id => id !== user?._id
            );
            
            // If we found another participant, try to get their details
            if (otherUserId && !recipient?._id) {
              try {
                const userResponse = await axios.get(
                  `${SERVER_URL}/api/users/${otherUserId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${userToken}`
                    }
                  }
                );
                
                if (userResponse.data) {
                  setRecipient(userResponse.data);
                }
              } catch (userError) {
                console.error('Error fetching other user details:', userError);
              }
            }
          }
        }
      } else {
        setMessages([]);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setIsLoading(false);
    }
  };

  // Modify fetchNewMessages to use the duplicate removal function
  const fetchNewMessages = async () => {
    if (!userToken || !existingConversationId) return;

    try {
      // Only fetch messages newer than the latest one we have
      const latestMessageTimestamp = messages.length > 0 ? new Date(messages[0].createdAt).getTime() : 0;
      
      const response = await axios.get(
        `${SERVER_URL}/api/messages/conversations/${existingConversationId}?since=${latestMessageTimestamp}`,
        {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        }
      );
      
      const newMessages = response.data.messages || [];
      
      if (newMessages.length > 0) {
        // Create a Set of existing message IDs to avoid duplicates
        const existingMessageIds = new Set(messages.map(msg => msg._id));
        
        // Filter out any messages that already exist in our state
        const filteredNewMessages = newMessages.filter(msg => !existingMessageIds.has(msg._id));
        
        if (filteredNewMessages.length > 0) {
          // Combine new messages with existing ones and ensure no duplicates
          setMessages(prevMessages => {
            const combined = [...filteredNewMessages, ...prevMessages];
            return removeDuplicateMessages(combined);
          });
        }
      }
    } catch (error) {
      console.error('Fetch new messages error:', error);
      // Silent fail for polling
    }
  };

  // Fetch property details
  const fetchPropertyDetails = async () => {
    if (!userToken || !propertyId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${SERVER_URL}/api/properties/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.data) {
        console.log('Property details loaded:', response.data.title);
        setPropertyDetails(response.data);
        
        // Check if the current user is the property owner
        const ownerIsCurrentUser = 
          response.data.owner && 
          effectiveUserId && 
          response.data.owner._id === effectiveUserId;
        
        console.log('Property owner check from details:', { 
          isOwner: ownerIsCurrentUser,
          ownerId: response.data.owner?._id,
          effectiveUserId
        });
        
        setIsPropertyOwner(ownerIsCurrentUser);
        
        // If user is property owner, fetch all conversations for this property
        if (ownerIsCurrentUser) {
          console.log('User is property owner, fetching all conversations');
          fetchAllPropertyConversations();
        }
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !userToken) return;
    
    // For property owners, ensure we have a selected conversation and recipient
    if (isPropertyOwner && !selectedConversation) {
      Alert.alert(
        'Select a Conversation',
        'Please select a conversation to send a message.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Always provide a valid message even without recipient info
    const recipientName = recipient?.name || 'User';
    console.log(`Sending message to ${recipientName}`);

    // Create a new message object for immediate display with a guaranteed unique ID
    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}-${Math.random().toString(36).substring(7)}`;
    const newMessage = {
      _id: tempMessageId,
      content: inputText.trim(),
      sender: user._id,
      receiver: recipient._id,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    // Add message to UI immediately for better UX
    setMessages(prevMessages => removeDuplicateMessages([newMessage, ...prevMessages]));
    setInputText('');
    
    // Scroll to bottom if we have a reference
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }

    // Add visual feedback that message is sending
    setIsSending(true);
    
    try {
      // Determine which conversation ID to use
      const conversationIdToUse = isPropertyOwner && selectedConversation ? 
                                 selectedConversation._id : 
                                 existingConversationId;
      
      console.log('Sending message with data:', {
        content: newMessage.content,
        receiverId: recipient._id,
        propertyId: propertyId,
        conversationId: conversationIdToUse,
        isPropertyOwner: isPropertyOwner
      });
      
      // Prepare request data
      const messageData = {
        content: newMessage.content,
        receiverId: recipient._id,
        propertyId: propertyId
      };
      
      // If we have an existing conversation, include it
      if (conversationIdToUse) {
        messageData.conversationId = conversationIdToUse;
      }
      
      // Send the message to the server
      const response = await axios.post(
        `${SERVER_URL}/api/messages`, 
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Message sent successfully:', response.data);
      
      // Update the message status to sent and use the server-generated ID
      setMessages(prevMessages => {
        // First remove the temporary message
        const filteredMessages = prevMessages.filter(msg => msg._id !== tempMessageId);
        // Then add the server-confirmed message with real ID
        const updatedMessages = [{
          ...response.data,
          status: 'sent'
        }, ...filteredMessages];
        
        // Ensure there are no duplicates
        return removeDuplicateMessages(updatedMessages);
      });
      
      // If this was a new conversation, update the conversation ID
      if (response.data.conversationId && 
         (!existingConversationId || existingConversationId !== response.data.conversationId)) {
        console.log('Setting conversation ID from response:', response.data.conversationId);
        setExistingConversationId(response.data.conversationId);
        
        // If we're the property owner, refresh all conversations
        if (isPropertyOwner) {
          setTimeout(() => {
            fetchAllPropertyConversations();
          }, 1000);
        } else {
          // Otherwise just fetch messages for this conversation
          setTimeout(() => {
            fetchMessages(response.data.conversationId);
          }, 500);
        }
      }
      
      setIsSending(false);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update message status to failed
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === tempMessageId ? { 
            ...msg, 
            status: 'failed' 
          } : msg
        )
      );
      
      setIsSending(false);
      
      Alert.alert(
        'Message Not Sent',
        'Could not deliver your message. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const retryMessage = async (failedMessage) => {
    // Remove the failed message
    setMessages(prevMessages =>
      prevMessages.filter(msg => msg._id !== failedMessage._id)
    );
    
    // Set the content in the input field
    setInputText(failedMessage.content);
  };

  const handlePropertyPress = () => {
    if (propertyDetails && propertyDetails._id) {
      navigation.navigate('PropertyDetails', { propertyId: propertyDetails._id });
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      // Today, show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      // Yesterday
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays < 7) {
      // Within a week, show day name
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()] + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // Older than a week, show date
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + 
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const shouldShowDateDivider = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.createdAt).toLocaleDateString();
    const prevDate = new Date(prevMsg.createdAt).toLocaleDateString();
    
    return currentDate !== prevDate;
  };

  // Render a single message
  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender === user?._id;
    const messageStatus = item.status || 'sent';
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          messageStatus === 'sending' && styles.sendingMessage
        ]}>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.messageTime}>
            {formatMessageTime(item.createdAt)}
            {messageStatus === 'sending' && ' • Sending...'}
          </Text>
        </View>
      </View>
    );
  };

  // Update the keyExtractor to ensure truly unique keys
  const keyExtractor = (item, index) => {
    // Use multiple factors to ensure uniqueness
    if (item._id) {
      // If we have an ID, use it along with index for extra safety
      return `msg-${item._id}-${index}`;
    } else {
      // If no ID, create a complex unique ID
      return `temp-${Date.now()}-${Math.random().toString(36).substring(7)}-${index}`;
    }
  };

  // Add a conversation selector component for property owners
  const renderConversationSelector = () => {
    if (!isPropertyOwner || allPropertyConversations.length === 0) return null;

    console.log('Rendering conversation selector with', allPropertyConversations.length, 'conversations');
    
    return (
      <View style={styles.conversationSelectorContainer}>
        <Text style={styles.conversationSelectorTitle}>Inquiries ({allPropertyConversations.length})</Text>
        <FlatList
          horizontal
          data={allPropertyConversations}
          keyExtractor={item => item._id}
          renderItem={({ item }) => {
            // Extract user name from conversation
            let userName = 'Unknown User';
            let userInfo = null;
            
            // First try to get from otherUser
            if (item.otherUser && typeof item.otherUser === 'object') {
              userName = item.otherUser.name || 'Unknown User';
              userInfo = item.otherUser;
            } 
            // Then try participants array
            else if (item.participants && Array.isArray(item.participants)) {
              const otherParticipant = item.participants.find(
                p => p._id !== user?._id
              );
              
              if (otherParticipant) {
                userName = otherParticipant.name || 'Unknown User';
                userInfo = otherParticipant;
              }
            }
            
            // Format the last message content
            let lastMessageText = 'No messages yet';
            if (item.lastMessage) {
              if (typeof item.lastMessage === 'string') {
                lastMessageText = item.lastMessage;
              } else if (typeof item.lastMessage === 'object' && item.lastMessage.content) {
                lastMessageText = item.lastMessage.content;
              }
            }
            
            return (
              <TouchableOpacity 
                style={[
                  styles.conversationItem,
                  selectedConversation && item._id === selectedConversation._id ? 
                    styles.selectedConversation : null
                ]}
                onPress={() => handleConversationSelect(item)}
              >
                <View style={styles.conversationHeader}>
                  <Text style={styles.conversationName} numberOfLines={1}>{userName}</Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lastMessageText} numberOfLines={2}>
                  {lastMessageText}
                </Text>
                <Text style={styles.conversationTime}>
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.conversationListContent}
        />
      </View>
    );
  };

  // Render the appropriate content based on state
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      );
    }

    if (isPropertyOwner && allPropertyConversations.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No inquiries about this property yet.</Text>
        </View>
      );
    }
    
    if (isPropertyOwner && !selectedConversation) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Select a conversation to view messages.</Text>
        </View>
      );
    }

    if (messages.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Send a message to start the conversation
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.messageList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  useEffect(() => {
    if (user) {
      console.log('User object updated in ChatScreen:', user._id);
      
      // Debug the user object
      debugUserObject();
    }
  }, [user]);
  
  // Debug function to help identify user ID issues
  const debugUserObject = () => {
    console.log('=== DEBUG USER OBJECT ===');
    console.log('User object type:', typeof user);
    console.log('User object keys:', user ? Object.keys(user) : 'null');
    console.log('User ID:', user?._id);
    console.log('User name:', user?.name);
    console.log('Is property owner:', isPropertyOwner);
    console.log('Property owner ID:', propertyDetails?.owner?._id);
    console.log('=== END DEBUG USER OBJECT ===');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Property Info Header */}
        {propertyDetails && (
          <TouchableOpacity 
            style={styles.propertyHeader}
            onPress={() => navigation.navigate('PropertyDetails', { propertyId })}
          >
            <Image 
              source={{ uri: propertyDetails.images && propertyDetails.images.length > 0 
                ? propertyDetails.images[0] 
                : 'https://via.placeholder.com/100' 
              }} 
              style={styles.propertyImage} 
            />
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyTitle} numberOfLines={1}>
                {propertyDetails.title || 'Property'}
              </Text>
              <Text style={styles.propertyPrice}>
                ₹{propertyDetails.price?.toLocaleString() || '0'}/month
              </Text>
              <Text style={styles.propertyLocation} numberOfLines={1}>
                {propertyDetails.location?.address || 'Location not available'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Conversation Selector (for property owners) */}
        {renderConversationSelector()}

        {/* Chat Content */}
        <View style={styles.chatContent}>
          {renderContent()}
        </View>

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  propertyHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  propertyImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginRight: 10,
  },
  propertyInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066cc',
    marginVertical: 3,
  },
  perMonth: {
    fontSize: 12,
    color: '#666',
  },
  propertyLocation: {
    fontSize: 12,
    color: '#666',
  },
  messageList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  messageContainer: {
    marginVertical: 5,
    flexDirection: 'row',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
  },
  ownMessageBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 5,
  },
  otherMessageBubble: {
    backgroundColor: '#ECECEC',
    borderBottomLeftRadius: 5,
  },
  sendingMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  chatContent: {
    flex: 1,
  },
  conversationSelectorContainer: {
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  conversationSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  conversationItem: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 150,
    maxWidth: 200,
  },
  selectedConversation: {
    backgroundColor: '#e0f0ff',
    borderWidth: 1,
    borderColor: '#0066cc',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  conversationName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  lastMessageText: {
    fontSize: 12,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-end',
  },
  conversationListContent: {
    padding: 10,
  },
});

export default ChatScreen;