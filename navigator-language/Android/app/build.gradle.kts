plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

import java.util.Properties
import java.io.FileInputStream

android {
    namespace = "com.example.navigatorlanguagedemo"
    compileSdk = 34

    buildFeatures {
        buildConfig = true
    }

    val envProperties = Properties()
    val envPropertiesFile = rootProject.file("env.properties")
    if (envPropertiesFile.exists()) {
        envProperties.load(FileInputStream(envPropertiesFile))
    }
    val mockServerIp = envProperties.getProperty("SERVER_IP", "10.0.2.2")
    val mockServerPort = envProperties.getProperty("SERVER_PORT", "3000")

    defaultConfig {
        applicationId = "com.example.navigatorlanguagedemo"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        
        buildConfigField("String", "SERVER_IP", "\"$mockServerIp\"")
        buildConfigField("String", "SERVER_PORT", "\"$mockServerPort\"")
        buildConfigField("String", "SERVER_BASE_URL", "\"http://$mockServerIp:$mockServerPort\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.10.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
}
