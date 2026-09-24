Pod::Spec.new do |s|
  s.name           = 'ExpoCutout'
  s.version        = '1.0.0'
  s.summary        = 'iOS Vision-based foreground cutout (transparent PNG) for Expo'
  s.description    = 'Expo Module that uses VNGenerateForegroundInstanceMaskRequest (iOS 17+) to remove image backgrounds and return a transparent PNG.'
  s.author         = 'iam-hovhannes'
  s.homepage       = 'https://github.com/iam-hovhannes/expo-cutout'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
