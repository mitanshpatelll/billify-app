const { withXcodeProject } = require('expo/config-plugins');

/**
 * The repo lives under "Career Sprint 2026": a path with spaces. The template's
 * "Bundle React Native code and images" phase runs react-native-xcode.sh through an unquoted
 * backtick substitution, so the script path splits at the first space and the build fails.
 * This rewrites `…` to "$(…)" on every prebuild (ios/ is generated and git-ignored).
 */
module.exports = function withQuotedBundlePhase(config) {
  return withXcodeProject(config, (cfg) => {
    const phases = cfg.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};
    for (const phase of Object.values(phases)) {
      if (typeof phase !== 'object' || typeof phase.shellScript !== 'string') continue;
      // The value is kept in its escaped pbxproj form, so a quote is written \".
      phase.shellScript = phase.shellScript.replace(
        /`([^`]*react-native-xcode\.sh[^`]*)`/,
        (_, command) => `\\"$(${command})\\"`,
      );
    }
    return cfg;
  });
};
