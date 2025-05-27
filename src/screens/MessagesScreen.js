import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../config/ip-config';
import { AuthContext } from '../context/AuthContext';

const MessagesScreen = ({ navigation }) => {
  const { userToken, user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('buyer'); // 'buyer' or 'seller'

  useEffect(() => {
    if (userToken) {
      fetchConversations();
    } else {
      setIsLoading(false);
    }
  }, [userToken]);

  // Add a focus listener to refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userToken) {
        fetchConversations();
      }
    });

    return unsubscribe;
  }, [navigation, userToken]);

  const fetchConversations = async () => {
    if (!userToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${SERVER_URL}/api/messages/conversations`);
      setConversations(response.data);
      setIsLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Fetch conversations error:', error);
      setIsLoading(false);
      setRefreshing(false);
      
      // Use mock data for demo
      // Include both buyer and seller perspectives
      setConversations(getMockConversations(user?._id));
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('ChatScreen', {
      conversationId: conversation._id,
      recipient: conversation.otherUser,
      propertyId: conversation.propertyId,
      propertyTitle: conversation.propertyTitle
    });
  };

  const deleteConversation = (conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from UI immediately for better UX
              setConversations(conversations.filter(conv => conv._id !== conversationId));
              
              // Make API call to delete on server
              await axios.delete(`${SERVER_URL}/api/messages/conversations/${conversationId}`);
            } catch (error) {
              console.error('Delete conversation error:', error);
              // Revert changes if server update fails
              fetchConversations();
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  const getFilteredConversations = () => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return conversations.filter(conversation => {
      const nameMatch = conversation.otherUser.name.toLowerCase().includes(query);
      const propertyMatch = conversation.propertyTitle.toLowerCase().includes(query);
      const messageMatch = conversation.lastMessage?.content.toLowerCase().includes(query);
      
      return nameMatch || propertyMatch || messageMatch;
    });
  };

  // Mock data function for demo purposes
  const getMockConversations = () => {
    const now = new Date();
    return [
      {
        _id: '1',
        otherUser: {
          _id: 'user1',
          name: 'John Smith',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
        },
        propertyId: '1',
        propertyTitle: '3 BHK Apartment in Whitefield',
        lastMessage: {
          content: 'Is this property still available?',
          createdAt: new Date(now - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          sender: 'user1',
          read: true
        },
        unreadCount: 0
      },
      {
        _id: '2',
        otherUser: {
          _id: 'user2',
          name: 'Sarah Johnson',
          avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
        },
        propertyId: '2',
        propertyTitle: '2 BHK Independent House',
        lastMessage: {
          content: 'Can I schedule a viewing for tomorrow at 3pm?',
          createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          sender: 'user2',
          read: false
        },
        unreadCount: 3
      },
      {
        _id: '3',
        otherUser: {
          _id: 'user3',
          name: 'Michael Chen',
          avatar: 'https://randomuser.me/api/portraits/men/67.jpg'
        },
        propertyId: '3',
        propertyTitle: '1200 sq.ft Commercial Space',
        lastMessage: {
          content: 'Thanks for the information. I will get back to you soon.',
          createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          sender: 'current_user',
          read: true
        },
        unreadCount: 0
      },
      {
        _id: '4',
        otherUser: {
          _id: 'user4',
          name: 'Emily Wilson',
          avatar: 'https://randomuser.me/api/portraits/women/33.jpg'
        },
        propertyId: '4',
        propertyTitle: '4 BHK Luxury Villa',
        lastMessage: {
          content: 'Is the price negotiable?',
          createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          sender: 'user4',
          read: true
        },
        unreadCount: 0
      },
    ];
  };

  // Render conversation item
  const renderConversationItem = ({ item }) => {
    const formatTime = (dateString) => {
      const now = new Date();
      const date = new Date(dateString);
      const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) {
        // Today, show time
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffInDays === 1) {
        // Yesterday
        return 'Yesterday';
      } else if (diffInDays < 7) {
        // Within a week, show day name
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getDay()];
      } else {
        // Older than a week, show date
        return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
      }
    };

    const isCurrentUserLastSender = item.lastMessage?.sender === 'current_user';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => deleteConversation(item._id)}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: item.otherUser.avatar || 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.otherUser.name}
            </Text>
            <Text style={styles.timeStamp}>
              {formatTime(item.lastMessage?.createdAt)}
            </Text>
          </View>
          
          <Text style={styles.propertyTitle} numberOfLines={1}>
            Re: {item.propertyTitle}
          </Text>
          
          <View style={styles.messagePreviewContainer}>
            {isCurrentUserLastSender && (
              <Text style={styles.sentPrefix}>You: </Text>
            )}
            <Text 
              style={[styles.messagePreview, !item.lastMessage?.read && !isCurrentUserLastSender && styles.unreadMessage]} 
              numberOfLines={1}
            >
              {item.lastMessage?.content}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // If not logged in, show login prompt
  if (!userToken) {
    return (
      <View style={styles.loginPromptContainer}>
        <Ionicons name="chatbubbles" size={80} color="#ddd" />
        <Text style={styles.loginPromptTitle}>No Messages</Text>
        <Text style={styles.loginPromptText}>
          Sign in to message property owners or view your conversations
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('ProfileTab')}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  const filteredConversations = getFilteredConversations();

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.emptyText}>
            When you contact property owners or receive inquiries, you'll see your conversations here
          </Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptySearchContainer}>
          <Text style={styles.emptySearchText}>
            No conversations match "{searchQuery}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={renderConversationItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  loginPromptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timeStamp: {
    fontSize: 12,
    color: '#999',
  },
  propertyTitle: {
    fontSize: 14,
    color: '#0066cc',
    marginBottom: 3,
  },
  messagePreviewContainer: {
    flexDirection: 'row',
  },
  sentPrefix: {
    fontSize: 14,
    color: '#666',
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    position: 'absolute',
    top: 15,
    left: 40,
    backgroundColor: '#ff3b30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MessagesScreen;
