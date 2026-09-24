const {
  createRunOncePlugin,
  IOSConfig,
} = require('@expo/config-plugins');

const MIN_IOS = '17.0';

function needsBump(current) {
  if (!current) return true;
  return parseFloat(String(current)) < parseFloat(MIN_IOS);
}

/**
 * Ensures the host app targets iOS 17.0+ (required by VNGenerateForegroundInstanceMaskRequest).
 * Updates Expo config, Xcode project, and Podfile.properties.json.
 */
const withExpoCutout = (config) => {
  config.ios = config.ios ?? {};
  if (needsBump(config.ios.deploymentTarget)) {
    config.ios.deploymentTarget = MIN_IOS;
  }

  // Writes ios.deploymentTarget into Podfile.properties.json (used by Podfile `platform :ios`)
  config = IOSConfig.DeploymentTarget.withDeploymentTargetPodfileProps(config);
  // Updates IPHONEOS_DEPLOYMENT_TARGET in the Xcode project
  config = IOSConfig.DeploymentTarget.withDeploymentTarget(config);

  return config;
};

module.exports = createRunOncePlugin(withExpoCutout, 'expo-cutout', '0.1.0');
