    // Main Render
    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor={enterpriseColors.gray50} />
            <View style={styles.container}>
                <LinearGradient
                    colors={[enterpriseColors.gray50, enterpriseColors.gray100]}
                    style={styles.backgroundGradient}
                />

                <SafeAreaView style={styles.safeArea}>
                    {/* Custom Header */}
                    <View style={styles.customHeader}>
                        <Text style={styles.headerTitle}>뷰어 모드</Text>
                        <TouchableOpacity 
                            style={styles.settingsButton}
                            onPress={() => {}}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="settings-outline" size={24} color={enterpriseColors.gray700} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={handleRefresh}
                                colors={[enterpriseColors.primary]}
                                progressBackgroundColor={enterpriseColors.gray50}
                            />
                        }
                    >
                        {renderQuickStats()}
                        {renderDeviceList()}
                        {renderQuickActions()}
                        {renderRecentConnections()}
                    </ScrollView>
                </SafeAreaView>
            </View>
        </>
    );
