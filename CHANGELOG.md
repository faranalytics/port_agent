# Changelog

## [1.4.5] - 2025-01-18
### Changed
- Improve documentation.


## [1.4.4] - 2025-01-17
### Changed
- Improve documentation.

## [1.4.3] - 2025-01-15
### Changed
- Improve documentation.
- Improve examples.

## [1.4.2] - 2025-01-15
### Changed
- Improve documentation.

## [1.4.1] - 2025-01-14
### Changed
- Improve documentation.
- Improve tests.

## [1.4.0] - 2023-12-30
### Changed
- Improve documentation.
- Refactor Agent and Message classes.
### Fixed
- Fixed Error message representation in order for stack traces to be observed.

## [1.3.0] - 2023-10-22
### Changed
- The semantics of Agent properties were improved.
- Notes clarifying usage and the goals the package were added.
### Fixed
- Cached CallMessages are removed prior to invocation.
- Awaited Calls are now correctly stored in a Map.

## [1.2.13] - 2023-10-01
### Changed
- Improve simple example.
- Improve documentation.

## [1.2.12] - 2023-09-30
### Changed
- Change access modifier on _online property.
- Change default value of _online property to resolved Promise.
- Improve documentation.
- Improve examples.

## [1.2.11] - 2023-09-30
### Added
- Added simple example.
### Fixed
- Delete rejected calls. 
- Add instructions to throw when awaiting an exited thread.
- Fix .gitignore directives.
### Changed
- Improve documentation.
- Exporte auxiliary classes and interfaces.

## [1.2.10] - 2023-09-30
### Deprecated
- port_agent@1.2.10 was deprecated due to an inappropriate addition to the interface.

## [1.2.9] - 2023-09-28
### Removed
- Remove dist.
### Changed
- Improve documentation.

## [1.2.8] - 2023-09-28
### Fixed
- Fix access specifiers.
### Changed
- Improve documentation.

## [1.2.7] - 2023-09-28
### Changed
- Improve documentation.

## [1.2.6] - 2023-09-26
### Changed
- Improve documentation.

## [1.2.5] - 2023-09-26
### Changed
- Improve documentation.
### Fixed
- Fixed unnecessary conditional logic.

## [1.2.4] - 2023-09-25
### Fixed
- Add instructions to throw on unhandled exceptions or on an exit of the Worker thread.

## [1.2.3] - 2023-09-24
### Added
- Add keywords.

## [1.2.2] - 2023-09-23
### Changed
- Improve documentation.
- Improve example.

## [1.2.1] - 2023-09-21
### Changed
- Improve documentation.

## [1.2.0] - 2023-09-19
### Fixed
- Improve typings.
- Reconstitute Errors.

## [1.1.3] - 2023-08-03
### Fixed
- Fix error in simple example output.

## [1.1.2] - 2023-08-03
### Changed
- Improve simple example.
### Removed
- Remove subclassing example from the README.md.

## [1.1.1] - 2023-08-02
### Changed
- Add type variable to call method.
- Change test to TypeScript.

## [1.1.0] - 2023-08-02
### Fixed
- Registration was errantly made async; this has been fixed in this version.  The previous minor version has been deprecated. 

## [1.0.0] - 2023-08-02
### Added
- This project adheres to Semantic Versioning.
### Changed
- Improve examples.
### Deprecated
### Fixed
### Removed
### Security