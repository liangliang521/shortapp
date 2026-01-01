import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Icon from '../icons/SvgIcons';

interface SearchBarProps {
  searchText: string;
  sortOrder: 'newest' | 'oldest';
  onSearchChange: (text: string) => void;
  onSortToggle: () => void;
}

export default function SearchBar({ 
  searchText, 
  sortOrder, 
  onSearchChange, 
  onSortToggle 
}: SearchBarProps) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Icon name="Search" size={20} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={onSearchChange}
          placeholder="Search"
          placeholderTextColor="#8E8E93"
        />
      </View>
      <TouchableOpacity style={styles.sortButton} onPress={onSortToggle}>
        <Text style={styles.sortText}>
          {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
        </Text>
        <Icon name="ChevronDown" size={16} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 4,
  },
});
