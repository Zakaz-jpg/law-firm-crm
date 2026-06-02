#!/usr/bin/env python3
"""Generates a valid LawCRM.xcodeproj for Xcode."""

import hashlib, os

BASE = os.path.dirname(os.path.abspath(__file__))
LAWCRM = os.path.join(BASE, "LawCRM")

def uid(seed):
    return hashlib.sha256(seed.encode()).hexdigest()[:24].upper()

# ── Source files ──────────────────────────────────────────────────────────────

PLIST_FILE   = "Info.plist"
PLIST_REF_ID = uid("info_plist_ref")

SWIFT_FILES = [
    ("LawCRMApp.swift",             "LawCRM"),
    ("Models/Models.swift",         "LawCRM/Models"),
    ("Network/APIClient.swift",     "LawCRM/Network"),
    ("Network/AuthManager.swift",   "LawCRM/Network"),
    ("Services/SyncService.swift",  "LawCRM/Services"),
    ("Views/Auth/LoginView.swift",               "LawCRM/Views/Auth"),
    ("Views/Cases/CasesListView.swift",          "LawCRM/Views/Cases"),
    ("Views/Cases/CaseDetailView.swift",         "LawCRM/Views/Cases"),
    ("Views/Cases/CreateCaseView.swift",         "LawCRM/Views/Cases"),
    ("Views/Cases/EditCaseView.swift",           "LawCRM/Views/Cases"),
    ("Views/Clients/ClientsListView.swift",      "LawCRM/Views/Clients"),
    ("Views/Clients/ClientDetailView.swift",     "LawCRM/Views/Clients"),
    ("Views/Dashboard/DashboardView.swift",      "LawCRM/Views/Dashboard"),
    ("Views/Calendar/CalendarView.swift",        "LawCRM/Views/Calendar"),
    ("Views/Profile/ProfileView.swift",          "LawCRM/Views/Profile"),
]

# ── UUIDs ─────────────────────────────────────────────────────────────────────

PROJECT_ID      = uid("project")
TARGET_ID       = uid("target")
MAIN_GROUP_ID   = uid("main_group")
LAWCRM_GROUP_ID = uid("lawcrm_group")
PRODUCTS_GROUP  = uid("products_group")
APP_REF_ID      = uid("app_ref")
ASSETS_REF_ID   = uid("assets_ref")
ASSETS_BUILD_ID = uid("assets_build")
SOURCES_PHASE   = uid("sources_phase")
FRAMEWORKS_PHASE= uid("frameworks_phase")
RESOURCES_PHASE = uid("resources_phase")
PROJ_CONFIGS    = uid("proj_configs")
TARGET_CONFIGS  = uid("target_configs")
DEBUG_PROJ      = uid("debug_proj")
RELEASE_PROJ    = uid("release_proj")
DEBUG_TARGET    = uid("debug_target")
RELEASE_TARGET  = uid("release_target")

# Groups for subdirectories
GROUPS = {
    "LawCRM/Models":          uid("group_models"),
    "LawCRM/Network":         uid("group_network"),
    "LawCRM/Services":        uid("group_services"),
    "LawCRM/Views":           uid("group_views"),
    "LawCRM/Views/Auth":      uid("group_views_auth"),
    "LawCRM/Views/Cases":     uid("group_views_cases"),
    "LawCRM/Views/Clients":   uid("group_views_clients"),
    "LawCRM/Views/Dashboard": uid("group_views_dashboard"),
    "LawCRM/Views/Calendar":  uid("group_views_calendar"),
    "LawCRM/Views/Profile":   uid("group_views_profile"),
}

FILE_REF = {rel: uid("ref_" + rel) for rel, _ in SWIFT_FILES}
BUILD_ID = {rel: uid("build_" + rel) for rel, _ in SWIFT_FILES}

# ── Helpers ───────────────────────────────────────────────────────────────────

def children_for_group(group_key):
    # Direct file children
    result = []
    for rel, grp in SWIFT_FILES:
        if grp == group_key:
            result.append(FILE_REF[rel])
    # Sub-group children
    for key, gid in GROUPS.items():
        parent = "/".join(key.split("/")[:-1])
        if parent == group_key:
            result.append(gid)
    return result

# ── Build project file ─────────────────────────────────────────────────────────

def pbx():
    lines = []
    w = lines.append

    w("// !$*UTF8*$!")
    w("{")
    w("\tarchiveVersion = 1;")
    w("\tclasses = {")
    w("\t};")
    w("\tobjectVersion = 56;")
    w("\tobjects = {")
    w("")

    # PBXBuildFile
    w("/* Begin PBXBuildFile section */")
    for rel, _ in SWIFT_FILES:
        fname = os.path.basename(rel)
        w(f"\t\t{BUILD_ID[rel]} /* {fname} in Sources */ = {{isa = PBXBuildFile; fileRef = {FILE_REF[rel]} /* {fname} */; }};")
    w(f"\t\t{ASSETS_BUILD_ID} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {ASSETS_REF_ID} /* Assets.xcassets */; }};")
    w(f"\t\t{uid('plist_build')} /* Info.plist in Resources */ = {{isa = PBXBuildFile; fileRef = {PLIST_REF_ID} /* Info.plist */; }};")
    w("/* End PBXBuildFile section */")
    w("")

    # PBXFileReference
    w("/* Begin PBXFileReference section */")
    w(f"\t\t{APP_REF_ID} /* LawCRM.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = LawCRM.app; sourceTree = BUILT_PRODUCTS_DIR; }};")
    w(f"\t\t{ASSETS_REF_ID} /* Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = \"<group>\"; }};")
    w(f"\t\t{PLIST_REF_ID} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; }};")
    for rel, _ in SWIFT_FILES:
        fname = os.path.basename(rel)
        w(f"\t\t{FILE_REF[rel]} /* {fname} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {fname}; sourceTree = \"<group>\"; }};")
    w("/* End PBXFileReference section */")
    w("")

    # PBXFrameworksBuildPhase
    w("/* Begin PBXFrameworksBuildPhase section */")
    w(f"\t\t{FRAMEWORKS_PHASE} /* Frameworks */ = {{")
    w("\t\t\tisa = PBXFrameworksBuildPhase;")
    w("\t\t\tbuildActionMask = 2147483647;")
    w("\t\t\tfiles = (")
    w("\t\t\t);")
    w("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    w("\t\t};")
    w("/* End PBXFrameworksBuildPhase section */")
    w("")

    # PBXGroup
    w("/* Begin PBXGroup section */")

    # Main group
    w(f"\t\t{MAIN_GROUP_ID} = {{")
    w("\t\t\tisa = PBXGroup;")
    w("\t\t\tchildren = (")
    w(f"\t\t\t\t{LAWCRM_GROUP_ID} /* LawCRM */,")
    w(f"\t\t\t\t{PRODUCTS_GROUP} /* Products */,")
    w("\t\t\t);")
    w("\t\t\tsourceTree = \"<group>\";")
    w("\t\t};")

    # Products
    w(f"\t\t{PRODUCTS_GROUP} /* Products */ = {{")
    w("\t\t\tisa = PBXGroup;")
    w("\t\t\tchildren = (")
    w(f"\t\t\t\t{APP_REF_ID} /* LawCRM.app */,")
    w("\t\t\t);")
    w("\t\t\tname = Products;")
    w("\t\t\tsourceTree = \"<group>\";")
    w("\t\t};")

    # LawCRM top-level group
    top_children = children_for_group("LawCRM") + [ASSETS_REF_ID, PLIST_REF_ID]
    w(f"\t\t{LAWCRM_GROUP_ID} /* LawCRM */ = {{")
    w("\t\t\tisa = PBXGroup;")
    w("\t\t\tchildren = (")
    for cid in top_children:
        w(f"\t\t\t\t{cid},")
    w("\t\t\t);")
    w("\t\t\tname = LawCRM;")
    w("\t\t\tpath = LawCRM;")
    w("\t\t\tsourceTree = \"<group>\";")
    w("\t\t};")

    # Sub-groups
    for key, gid in GROUPS.items():
        name = key.split("/")[-1]
        children = children_for_group(key)
        w(f"\t\t{gid} /* {name} */ = {{")
        w("\t\t\tisa = PBXGroup;")
        w("\t\t\tchildren = (")
        for cid in children:
            w(f"\t\t\t\t{cid},")
        w("\t\t\t);")
        w(f"\t\t\tname = {name};")
        w(f"\t\t\tpath = {name};")
        w("\t\t\tsourceTree = \"<group>\";")
        w("\t\t};")

    w("/* End PBXGroup section */")
    w("")

    # PBXNativeTarget
    w("/* Begin PBXNativeTarget section */")
    w(f"\t\t{TARGET_ID} /* LawCRM */ = {{")
    w("\t\t\tisa = PBXNativeTarget;")
    w(f"\t\t\tbuildConfigurationList = {TARGET_CONFIGS} /* Build configuration list for PBXNativeTarget \"LawCRM\" */;")
    w("\t\t\tbuildPhases = (")
    w(f"\t\t\t\t{SOURCES_PHASE} /* Sources */,")
    w(f"\t\t\t\t{FRAMEWORKS_PHASE} /* Frameworks */,")
    w(f"\t\t\t\t{RESOURCES_PHASE} /* Resources */,")
    w("\t\t\t);")
    w("\t\t\tbuildRules = (")
    w("\t\t\t);")
    w("\t\t\tdependencies = (")
    w("\t\t\t);")
    w("\t\t\tname = LawCRM;")
    w("\t\t\tproductName = LawCRM;")
    w(f"\t\t\tproductReference = {APP_REF_ID} /* LawCRM.app */;")
    w("\t\t\tproductType = \"com.apple.product-type.application\";")
    w("\t\t};")
    w("/* End PBXNativeTarget section */")
    w("")

    # PBXProject
    w("/* Begin PBXProject section */")
    w(f"\t\t{PROJECT_ID} /* Project object */ = {{")
    w("\t\t\tisa = PBXProject;")
    w(f"\t\t\tbuildConfigurationList = {PROJ_CONFIGS} /* Build configuration list for PBXProject \"LawCRM\" */;")
    w("\t\t\tcompatibilityVersion = \"Xcode 14.0\";")
    w("\t\t\tdevelopmentRegion = ru;")
    w("\t\t\thasScannedForEncodings = 0;")
    w("\t\t\tknownRegions = (")
    w("\t\t\t\ten,")
    w("\t\t\t\tBase,")
    w("\t\t\t\tru,")
    w("\t\t\t);")
    w(f"\t\t\tmainGroup = {MAIN_GROUP_ID};")
    w(f"\t\t\tproductRefGroup = {PRODUCTS_GROUP} /* Products */;")
    w("\t\t\tprojectDirPath = \"\";")
    w("\t\t\tprojectRoot = \"\";")
    w("\t\t\ttargets = (")
    w(f"\t\t\t\t{TARGET_ID} /* LawCRM */,")
    w("\t\t\t);")
    w("\t\t};")
    w("/* End PBXProject section */")
    w("")

    # PBXResourcesBuildPhase
    w("/* Begin PBXResourcesBuildPhase section */")
    w(f"\t\t{RESOURCES_PHASE} /* Resources */ = {{")
    w("\t\t\tisa = PBXResourcesBuildPhase;")
    w("\t\t\tbuildActionMask = 2147483647;")
    w("\t\t\tfiles = (")
    w(f"\t\t\t\t{ASSETS_BUILD_ID} /* Assets.xcassets in Resources */,")
    w("\t\t\t);")
    w("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    w("\t\t};")
    w("/* End PBXResourcesBuildPhase section */")
    w("")

    # PBXSourcesBuildPhase
    w("/* Begin PBXSourcesBuildPhase section */")
    w(f"\t\t{SOURCES_PHASE} /* Sources */ = {{")
    w("\t\t\tisa = PBXSourcesBuildPhase;")
    w("\t\t\tbuildActionMask = 2147483647;")
    w("\t\t\tfiles = (")
    for rel, _ in SWIFT_FILES:
        fname = os.path.basename(rel)
        w(f"\t\t\t\t{BUILD_ID[rel]} /* {fname} in Sources */,")
    w("\t\t\t);")
    w("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    w("\t\t};")
    w("/* End PBXSourcesBuildPhase section */")
    w("")

    # XCBuildConfiguration
    w("/* Begin XCBuildConfiguration section */")

    proj_debug_settings = {
        "ALWAYS_SEARCH_USER_PATHS": "NO",
        "CLANG_ENABLE_MODULES": "YES",
        "CLANG_ENABLE_OBJC_ARC": "YES",
        "CLANG_ENABLE_OBJC_WEAK": "YES",
        "CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING": "YES",
        "CLANG_WARN_BOOL_CONVERSION": "YES",
        "CLANG_WARN_COMMA": "YES",
        "CLANG_WARN_CONSTANT_CONVERSION": "YES",
        "CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS": "YES",
        "CLANG_WARN_DIRECT_OBJC_ISA_USAGE": "YES_ERROR",
        "CLANG_WARN_EMPTY_BODY": "YES",
        "CLANG_WARN_ENUM_CONVERSION": "YES",
        "CLANG_WARN_INFINITE_RECURSION": "YES",
        "CLANG_WARN_INT_CONVERSION": "YES",
        "CLANG_WARN_NON_LITERAL_NULL_CONVERSION": "YES",
        "CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF": "YES",
        "CLANG_WARN_OBJC_LITERAL_CONVERSION": "YES",
        "CLANG_WARN_OBJC_ROOT_CLASS": "YES_ERROR",
        "CLANG_WARN_RANGE_LOOP_ANALYSIS": "YES",
        "CLANG_WARN_SUSPICIOUS_MOVE": "YES",
        "CLANG_WARN_UNGUARDED_AVAILABILITY": "YES_AGGRESSIVE",
        "CLANG_WARN_UNREACHABLE_CODE": "YES",
        "COPY_PHASE_STRIP": "NO",
        "DEBUG_INFORMATION_FORMAT": "dwarf",
        "ENABLE_STRICT_OBJC_MSGSEND": "YES",
        "ENABLE_TESTABILITY": "YES",
        "GCC_C_LANGUAGE_STANDARD": "gnu17",
        "GCC_DYNAMIC_NO_PIC": "NO",
        "GCC_NO_COMMON_BLOCKS": "YES",
        "GCC_OPTIMIZATION_LEVEL": "0",
        "GCC_PREPROCESSOR_DEFINITIONS": '"DEBUG=1 $(inherited)"',
        "GCC_WARN_64_TO_32_BIT_CONVERSION": "YES",
        "GCC_WARN_ABOUT_RETURN_TYPE": "YES_ERROR",
        "GCC_WARN_UNDECLARED_SELECTOR": "YES",
        "GCC_WARN_UNINITIALIZED_AUTOS": "YES_AGGRESSIVE",
        "GCC_WARN_UNUSED_FUNCTION": "YES",
        "GCC_WARN_UNUSED_VARIABLE": "YES",
        "IPHONEOS_DEPLOYMENT_TARGET": "17.0",
        "MTL_ENABLE_DEBUG_INFO": "INCLUDE_SOURCE",
        "MTL_FAST_MATH": "YES",
        "ONLY_ACTIVE_ARCH": "YES",
        "SDKROOT": "iphoneos",
        "SWIFT_ACTIVE_COMPILATION_CONDITIONS": "DEBUG",
        "SWIFT_OPTIMIZATION_LEVEL": '"-Onone"',
    }

    proj_release_settings = {k: v for k, v in proj_debug_settings.items()}
    proj_release_settings.update({
        "DEBUG_INFORMATION_FORMAT": '"dwarf-with-dsym"',
        "ENABLE_NS_ASSERTIONS": "NO",
        "ENABLE_TESTABILITY": "NO",
        "GCC_OPTIMIZATION_LEVEL": "s",
        "MTL_ENABLE_DEBUG_INFO": "NO",
        "ONLY_ACTIVE_ARCH": "NO",
        "SWIFT_ACTIVE_COMPILATION_CONDITIONS": '""',
        "SWIFT_OPTIMIZATION_LEVEL": '"-O"',
        "VALIDATE_PRODUCT": "YES",
    })
    del proj_release_settings["GCC_DYNAMIC_NO_PIC"]
    del proj_release_settings["GCC_PREPROCESSOR_DEFINITIONS"]

    target_common = {
        "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon",
        "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME": "AccentColor",
        "CODE_SIGN_STYLE": "Automatic",
        "CURRENT_PROJECT_VERSION": "1",
        "INFOPLIST_FILE": "LawCRM/Info.plist",
        "IPHONEOS_DEPLOYMENT_TARGET": "17.0",
        "LD_RUNPATH_SEARCH_PATHS": '"@executable_path/Frameworks"',
        "MARKETING_VERSION": '"1.0"',
        "PRODUCT_BUNDLE_IDENTIFIER": "com.lawcrm",
        "PRODUCT_NAME": '"$(TARGET_NAME)"',
        "SDKROOT": "iphoneos",
        "SWIFT_EMIT_LOC_STRINGS": "YES",
        "SWIFT_VERSION": '"5.0"',
        "TARGETED_DEVICE_FAMILY": '"1,2"',
    }

    def write_config(cid, name, settings):
        w(f"\t\t{cid} /* {name} */ = {{")
        w("\t\t\tisa = XCBuildConfiguration;")
        w("\t\t\tbuildSettings = {")
        for k, v in sorted(settings.items()):
            w(f"\t\t\t\t{k} = {v};")
        w("\t\t\t};")
        w(f"\t\t\tname = {name};")
        w("\t\t};")

    write_config(DEBUG_PROJ, "Debug", proj_debug_settings)
    write_config(RELEASE_PROJ, "Release", proj_release_settings)
    write_config(DEBUG_TARGET, "Debug", {**target_common, "SWIFT_ACTIVE_COMPILATION_CONDITIONS": "DEBUG"})
    write_config(RELEASE_TARGET, "Release", target_common)

    w("/* End XCBuildConfiguration section */")
    w("")

    # XCConfigurationList
    w("/* Begin XCConfigurationList section */")
    w(f"\t\t{PROJ_CONFIGS} /* Build configuration list for PBXProject \"LawCRM\" */ = {{")
    w("\t\t\tisa = XCConfigurationList;")
    w("\t\t\tbuildConfigurations = (")
    w(f"\t\t\t\t{DEBUG_PROJ} /* Debug */,")
    w(f"\t\t\t\t{RELEASE_PROJ} /* Release */,")
    w("\t\t\t);")
    w("\t\t\tdefaultConfigurationIsVisible = 0;")
    w("\t\t\tdefaultConfigurationName = Release;")
    w("\t\t};")
    w(f"\t\t{TARGET_CONFIGS} /* Build configuration list for PBXNativeTarget \"LawCRM\" */ = {{")
    w("\t\t\tisa = XCConfigurationList;")
    w("\t\t\tbuildConfigurations = (")
    w(f"\t\t\t\t{DEBUG_TARGET} /* Debug */,")
    w(f"\t\t\t\t{RELEASE_TARGET} /* Release */,")
    w("\t\t\t);")
    w("\t\t\tdefaultConfigurationIsVisible = 0;")
    w("\t\t\tdefaultConfigurationName = Release;")
    w("\t\t};")
    w("/* End XCConfigurationList section */")
    w("")

    w("\t};")
    w(f"\trootObject = {PROJECT_ID} /* Project object */;")
    w("}")

    return "\n".join(lines)

# ── Assets.xcassets ───────────────────────────────────────────────────────────

def create_assets():
    assets_dir = os.path.join(LAWCRM, "Assets.xcassets")
    os.makedirs(assets_dir, exist_ok=True)
    with open(os.path.join(assets_dir, "Contents.json"), "w") as f:
        f.write('{\n  "info" : {\n    "author" : "xcode",\n    "version" : 1\n  }\n}\n')

    appicon = os.path.join(assets_dir, "AppIcon.appiconset")
    os.makedirs(appicon, exist_ok=True)
    # Не перезаписываем Contents.json если уже есть иконки
    appicon_json = os.path.join(appicon, "Contents.json")
    if not os.path.exists(appicon_json) or '"images" : []' in open(appicon_json).read():
        with open(appicon_json, "w") as f:
            f.write('{\n  "images" : [],\n  "info" : { "author" : "xcode", "version" : 1 }\n}\n')

    accent = os.path.join(assets_dir, "AccentColor.colorset")
    os.makedirs(accent, exist_ok=True)
    with open(os.path.join(accent, "Contents.json"), "w") as f:
        f.write('{\n  "colors" : [{"idiom":"universal"}],\n  "info" : {"author":"xcode","version":1}\n}\n')

# ── Write project ─────────────────────────────────────────────────────────────

def main():
    proj_dir = os.path.join(BASE, "LawCRM.xcodeproj")
    os.makedirs(proj_dir, exist_ok=True)

    pbxproj = os.path.join(proj_dir, "project.pbxproj")
    with open(pbxproj, "w", encoding="utf-8") as f:
        f.write(pbx())

    create_assets()

    print(f"✓ Generated: {proj_dir}")
    print(f"✓ Assets:    {LAWCRM}/Assets.xcassets")

if __name__ == "__main__":
    main()
