import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    alert(`${title}\n\n${message}`);
  }
};

export default function HelpSupportScreen() {
  const handleContactSupport = () => {
    showAlert(
      "Contact Support",
      "Email: support@autoparts.com\nPhone: +1 (555) 123-4567\n\nOur team will respond within 24 hours."
    );
  };

  const handleLiveChat = () => {
    showAlert("Live Chat", "Live chat feature coming soon! For immediate assistance, please call us.");
  };

  const openEmail = () => {
    Linking.openURL('mailto:support@autoparts.com');
  };

  const openPhone = () => {
    Linking.openURL('tel:+15551234567');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          
          <TouchableOpacity style={styles.contactCard} onPress={handleLiveChat}>
            <View style={styles.contactIcon}>
              <Ionicons name="chatbubbles" size={28} color="#4285F4" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Live Chat</Text>
              <Text style={styles.contactDescription}>Chat with our support team</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={openEmail}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={28} color="#4CAF50" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactDescription}>support@autoparts.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={openPhone}>
            <View style={styles.contactIcon}>
              <Ionicons name="call" size={28} color="#FF9800" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Phone Support</Text>
              <Text style={styles.contactDescription}>+1 (555) 123-4567</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <TouchableOpacity
            style={styles.faqItem}
            onPress={() => showAlert("Shipping", "We offer free shipping on orders over $50. Standard shipping takes 3-5 business days.")}
          >
            <Text style={styles.faqQuestion}>How long does shipping take?</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.faqItem}
            onPress={() => showAlert("Returns", "You can return items within 30 days of purchase. Items must be unused and in original packaging.")}
          >
            <Text style={styles.faqQuestion}>What is your return policy?</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.faqItem}
            onPress={() => showAlert("Payment", "We accept all major credit cards, debit cards, and PayPal.")}
          >
            <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.faqItem}
            onPress={() => showAlert("Tracking", "You will receive a tracking number via email once your order ships. You can also track orders in the Orders tab.")}
          >
            <Text style={styles.faqQuestion}>How can I track my order?</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.faqItem}
            onPress={() => showAlert("Warranty", "All parts come with manufacturer warranty. Warranty period varies by product (typically 12-36 months).")}
          >
            <Text style={styles.faqQuestion}>Do parts come with warranty?</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => showAlert("Installation Guides", "Installation guides are available on our website for most parts.")}
          >
            <Ionicons name="construct-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>Installation Guides</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => showAlert("Terms of Service", "View our complete terms of service on our website.")}
          >
            <Ionicons name="document-text-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => showAlert("Privacy Policy", "Your privacy is important to us. View our full privacy policy on our website.")}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color="#666" />
            <Text style={styles.menuItemText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Business Hours */}
        <View style={styles.hoursCard}>
          <Ionicons name="time-outline" size={24} color="#4285F4" />
          <View style={styles.hoursInfo}>
            <Text style={styles.hoursTitle}>Business Hours</Text>
            <Text style={styles.hoursText}>Monday - Friday: 9:00 AM - 6:00 PM</Text>
            <Text style={styles.hoursText}>Saturday: 10:00 AM - 4:00 PM</Text>
            <Text style={styles.hoursText}>Sunday: Closed</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 13,
    color: "#666",
  },
  faqItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    color: "#000",
    marginRight: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    marginLeft: 16,
  },
  hoursCard: {
    flexDirection: "row",
    backgroundColor: "#E8F0FE",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
  },
  hoursInfo: {
    marginLeft: 16,
    flex: 1,
  },
  hoursTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1565C0",
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 13,
    color: "#1565C0",
    marginBottom: 4,
  },
});
