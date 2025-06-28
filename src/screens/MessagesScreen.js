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
  RefreshControl,
  SectionList,
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
  const [viewMode, setViewMode] = useState('all'); // 'all', 'byProperty', 'myListings'
  const [myProperties, setMyProperties] = useState([]);
  const [propertyConversations, setPropertyConversations] = useState({});

  useEffect(() => {
    if (userToken) {
      fetchConversations();
      fetchMyProperties();
    } else {
      setIsLoading(false);
    }
  }, [userToken]);

  // Add a focus listener to refresh data when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (userToken) {
        fetchConversations();
        fetchMyProperties();
      }
    });

    return unsubscribe;
  }, [navigation, userToken]);

  // Auto-switch to My Listings mode if user has properties but no regular conversations
  useEffect(() => {
    if (conversations.length === 0 && myProperties.length > 0) {
      setViewMode('myListings');
    }
  }, [conversations, myProperties]);

  const fetchConversations = async () => {
    if (!userToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${SERVER_URL}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      console.log(`Fetched ${response.data.length} conversations`);
      setConversations(response.data);
      setIsLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Fetch conversations error:', error);
      setIsLoading(false);
      setRefreshing(false);
      
      // Show error alert instead of using mock data
      Alert.alert(
        'Error',
        'Failed to load conversations. Please try again later.',
        [{ text: 'OK' }]
      );
      
      // Set empty conversations array
      setConversations([]);
    }
  };

  // Fetch properties owned by the current user
  const fetchMyProperties = async () => {
    if (!userToken) return;
    
    try {
      const response = await axios.get(`${SERVER_URL}/api/properties/my`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      console.log(`Fetched ${response.data.length} owned properties`);
      setMyProperties(response.data);
      
      // For each property, fetch conversations
      response.data.forEach(property => {
        fetchPropertyConversations(property._id);
      });
    } catch (error) {
      console.error('Failed to fetch owned properties:', error);
    }
  };

  // Fetch conversations for a specific property
  const fetchPropertyConversations = async (propertyId) => {
    if (!userToken) return;
    
    try {
      const response = await axios.get(`${SERVER_URL}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      // Filter conversations for this property
      const forThisProperty = response.data.filter(conv => 
        conv.propertyId === propertyId
      );
      
      console.log(`Found ${forThisProperty.length} conversations for property ${propertyId}`);
      
      // Update the state with these conversations
      setPropertyConversations(prev => ({
        ...prev,
        [propertyId]: forThisProperty
      }));
    } catch (error) {
      console.error(`Failed to fetch conversations for property ${propertyId}:`, error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation._id,
      recipient: conversation.otherUser,
      propertyId: conversation.propertyId,
      propertyTitle: conversation.propertyTitle,
      propertyImage: conversation.propertyImage,
      userName: conversation.otherUser.name
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
              await axios.delete(`${SERVER_URL}/api/messages/conversations/${conversationId}`, {
                headers: {
                  'Authorization': `Bearer ${userToken}`
                }
              });
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

  // Group conversations by property
  const getGroupedConversations = () => {
    const filtered = getFilteredConversations();
    
    // Group by property
    const groupedByProperty = {};
    filtered.forEach(conversation => {
      const propertyId = conversation.propertyId || 'unknown';
      if (!groupedByProperty[propertyId]) {
        groupedByProperty[propertyId] = {
          propertyId,
          propertyTitle: conversation.propertyTitle || 'Unknown Property',
          propertyImage: conversation.propertyImage,
          conversations: []
        };
      }
      groupedByProperty[propertyId].conversations.push(conversation);
    });
    
    // Convert to array format for SectionList
    return Object.values(groupedByProperty).map(group => ({
      title: group.propertyTitle,
      propertyId: group.propertyId,
      propertyImage: group.propertyImage,
      data: group.conversations
    }));
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
        propertyId: 'prop1',
        propertyTitle: '3 BHK Apartment in Whitefield',
        propertyImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
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
        propertyId: 'prop2',
        propertyTitle: '2 BHK Independent House',
        propertyImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
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
        propertyId: 'prop1', // Same property as conversation 1
        propertyTitle: '3 BHK Apartment in Whitefield',
        propertyImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
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
        propertyId: 'prop3',
        propertyTitle: '4 BHK Luxury Villa',
        propertyImage: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80',
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

  // Format time for messages
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

  // Render conversation item
  const renderConversationItem = ({ item }) => {
    const isCurrentUserLastSender = item.lastMessage?.sender === user?._id || item.lastMessage?.sender === 'current_user';

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
              {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}
            </Text>
          </View>
          
          <Text style={styles.lastMessage} numberOfLines={1}>
            {isCurrentUserLastSender && 'You: '}
            {item.lastMessage ? item.lastMessage.content : 'No messages yet'}
          </Text>
          
          <Text style={styles.propertyName} numberOfLines={1}>
            <Ionicons name="home-outline" size={12} color="#666" /> {item.propertyTitle}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render section header for property grouping
  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Image 
        source={{ uri: section.propertyImage || 'https://via.placeholder.com/100' }}
        style={styles.sectionImage}
      />
      <Text style={styles.sectionTitle} numberOfLines={1}>
        {section.title}
      </Text>
      <TouchableOpacity 
        style={styles.viewPropertyButton}
        onPress={() => navigation.navigate('PropertyDetails', { propertyId: section.propertyId })}
      >
        <Text style={styles.viewPropertyText}>View</Text>
      </TouchableOpacity>
    </View>
  );

  // Toggle between view modes
  const toggleViewMode = () => {
    if (viewMode === 'all') {
      setViewMode('byProperty');
    } else if (viewMode === 'byProperty') {
      setViewMode('myListings');
    } else {
      setViewMode('all');
    }
  };

  // Render a section for each of the user's properties
  const renderMyListingsView = () => {
    if (myProperties.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="home-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>You don't have any listings</Text>
          <Text style={styles.emptySubText}>
            Add a property listing to start receiving messages
          </Text>
          <TouchableOpacity
            style={styles.addListingButton}
            onPress={() => navigation.navigate('AddPropertyScreen')}
          >
            <Text style={styles.addListingButtonText}>Add a Listing</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={myProperties}
        keyExtractor={(item) => item._id}
        renderItem={renderPropertyWithConversations}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0066cc']}
          />
        }
      />
    );
  };

  // Render a property with its conversations
  const renderPropertyWithConversations = ({ item: property }) => {
    const propertyConvs = propertyConversations[property._id] || [];
    
    return (
      <View style={styles.propertyContainer}>
        <View style={styles.propertyHeader}>
          <Image 
            source={{ uri: property.images && property.images.length > 0 
              ? property.images[0] 
              : 'https://via.placeholder.com/100' 
            }}
            style={styles.propertyImage}
          />
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {property.title}
            </Text>
            <Text style={styles.propertyPrice}>
              ₹{property.price?.toLocaleString() || '0'}/month
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.viewPropertyButton}
            onPress={() => navigation.navigate('PropertyDetails', { propertyId: property._id })}
          >
            <Text style={styles.viewPropertyText}>View</Text>
          </TouchableOpacity>
        </View>

        {propertyConvs.length > 0 ? (
          <View style={styles.conversationsContainer}>
            <Text style={styles.conversationsTitle}>
              {propertyConvs.length} {propertyConvs.length === 1 ? 'Inquiry' : 'Inquiries'}
            </Text>
            {propertyConvs.map(conversation => (
              <TouchableOpacity
                key={conversation._id}
                style={styles.inquiryItem}
                onPress={() => handleConversationPress(conversation)}
              >
                <Image 
                  source={{ uri: conversation.otherUser.avatar || 'https://via.placeholder.com/150' }}
                  style={styles.inquiryAvatar}
                />
                <View style={styles.inquiryContent}>
                  <Text style={styles.inquiryName} numberOfLines={1}>
                    {conversation.otherUser.name}
                  </Text>
                  <Text style={styles.inquiryMessage} numberOfLines={1}>
                    {conversation.lastMessage ? conversation.lastMessage.content : 'No messages yet'}
                  </Text>
                  <Text style={styles.inquiryTime}>
                    {conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ''}
                  </Text>
                </View>
                {conversation.unreadCount > 0 && (
                  <View style={styles.unreadBadgeSmall}>
                    <Text style={styles.unreadBadgeTextSmall}>{conversation.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.noInquiriesContainer}>
            <Text style={styles.noInquiriesText}>No inquiries yet</Text>
          </View>
        )}
      </View>
    );
  };

  // Render header with segmented control buttons
  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Messages</Text>
        
        {/* View type selector */}
        <View style={styles.segmentedControlContainer}>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'all' && styles.activeSegment]}
            onPress={() => setViewMode('all')}
          >
            <Text style={[styles.segmentText, viewMode === 'all' && styles.activeSegmentText]}>All</Text>
          </TouchableOpacity>
          
          {myProperties.length > 0 && (
            <TouchableOpacity
              style={[styles.segmentButton, viewMode === 'myListings' && styles.activeSegment]}
              onPress={() => setViewMode('myListings')}
            >
              <Text style={[styles.segmentText, viewMode === 'myListings' && styles.activeSegmentText]}>
                My Listings
                {Object.values(propertyConversations).flat().length > 0 && (
                  <Text style={styles.notificationBadge}> • </Text>
                )}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Property Inquiries Shortcut */}
        {myProperties.length > 0 && viewMode !== 'myListings' && (
          <TouchableOpacity 
            style={styles.inquiriesButton}
            onPress={() => setViewMode('myListings')}
          >
            <Text style={styles.inquiriesButtonText}>
              View Property Inquiries
              {Object.values(propertyConversations).flat().length > 0 && " 🔴"}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Search input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          )}
        </View>
      </View>
    );
  };

  // Return appropriate view based on mode
  const renderContent = () => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      );
    }

    if (viewMode === 'myListings') {
      return renderMyListingsView();
    } else if (viewMode === 'byProperty') {
      // Group by property view
      return (
        <SectionList
          sections={getGroupedConversations()}
          keyExtractor={(item) => item._id}
          renderItem={renderConversationItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#0066cc']}
            />
          }
        />
      );
    } else {
      // Flat list view (all)
      return getFilteredConversations().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubText}>
            Messages from property owners and interested buyers will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredConversations()}
          keyExtractor={(item) => item._id}
          renderItem={renderConversationItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#0066cc']}
            />
          }
        />
      );
    }
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

  return (
    <View style={styles.container}>
      {/* Header */}
      {renderHeader()}
      
      {/* Content based on view mode */}
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viewModeButton: {
    padding: 5,
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
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: '80%',
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  unreadBadge: {
    position: 'absolute',
    top: 12,
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
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
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
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  propertyName: {
    fontSize: 12,
    color: '#0066cc',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1e0ff',
  },
  sectionImage: {
    width: 30,
    height: 30,
    borderRadius: 5,
    marginRight: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  viewPropertyButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  viewPropertyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  propertyContainer: {
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    margin: 10,
  },
  propertyHeader: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f8f8',
  },
  propertyImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
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
    color: '#0066cc',
    marginTop: 2,
  },
  conversationsContainer: {
    padding: 10,
  },
  conversationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  inquiryItem: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  inquiryAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  inquiryContent: {
    flex: 1,
  },
  inquiryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  inquiryMessage: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  inquiryTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  noInquiriesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noInquiriesText: {
    fontSize: 14,
    color: '#999',
  },
  unreadBadgeSmall: {
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadBadgeTextSmall: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addListingButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
  },
  addListingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewModeText: {
    fontSize: 14,
    color: '#0066cc',
    marginLeft: 5,
  },
  inquiriesButton: {
    backgroundColor: '#f0f8ff', 
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginVertical: 10,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#4682b4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inquiriesButtonText: {
    color: '#4682b4',
    fontWeight: '500',
    fontSize: 14,
  },
  notificationBadge: {
    color: 'red',
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentButton: {
    padding: 10,
  },
  activeSegment: {
    backgroundColor: '#0066cc',
  },
  segmentText: {
    fontSize: 14,
    color: '#333',
  },
  activeSegmentText: {
    color: '#fff',
  },
});

export default MessagesScreen;
