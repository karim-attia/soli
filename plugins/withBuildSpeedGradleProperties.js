// Injects build-speed Gradle settings into android/gradle.properties on every prebuild.
// In-repo (instead of ~/.gradle/gradle.properties) so the settings are reproducible via git
// and survive `expo prebuild --clean`, which regenerates android/gradle.properties.
// Benchmarked 2026-07-06: config cache cut the warm `yarn release` Gradle portion ~16s -> ~13s.
// See docs/product/faster-builds/faster-builds.md.
const { withGradleProperties } = require('expo/config-plugins');

const BUILD_SPEED_PROPERTIES = [
	// Reuse task outputs across cleans/branch switches (restores instead of recompiling).
	{ type: 'property', key: 'org.gradle.caching', value: 'true' },
	// Skip the configuration phase when build config is unchanged (supported since RN 0.79).
	{ type: 'property', key: 'org.gradle.configuration-cache', value: 'true' },
	// The Expo template runs untracked `node` resolution commands at configuration time
	// (android/app/build.gradle) — warn instead of fail on these known incompatibilities.
	// Caveat: after `yarn install` moves packages, the cached configuration can go stale;
	// fix with `--no-configuration-cache` once or delete android/.gradle/configuration-cache/.
	{ type: 'property', key: 'org.gradle.configuration-cache.problems', value: 'warn' },
	// Bigger daemon heap than the RN template default (2g); machine has 16 GB.
	{ type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx4g -XX:MaxMetaspaceSize=1g' },
];

module.exports = function withBuildSpeedGradleProperties(config) {
	return withGradleProperties(config, (modConfig) => {
		const managedKeys = new Set(BUILD_SPEED_PROPERTIES.map((prop) => prop.key));
		modConfig.modResults = modConfig.modResults.filter(
			(item) => !(item.type === 'property' && managedKeys.has(item.key)),
		);
		modConfig.modResults.push(...BUILD_SPEED_PROPERTIES);
		return modConfig;
	});
};
