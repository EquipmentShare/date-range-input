# Contributing @equipmentshare/eslint-config-es-base-js

The `@equipmentshare/eslint-config-es-base-js` project operates an open contributor model where anyone is welcome to contribute towards development in the form of peer review, testing and patches. This document explains the practical process and guidelines for contributing.

Firstly in terms of structure, there is no particular concept of "Core
developers" in the sense of privileged people. Open source (and hopefully in-house libraries) often naturally revolve around meritocracy where longer term contributors gain more trust from
the developer community. However, some hierarchy is necessary for practical
purposes. As such there are repository "code owners" who are responsible for
merging merge requests and ensuring a cohesive, constructive environment and vision for this project going forward.


## Contributor Workflow

To contribute a patch, the workflow is as follows:

1. Create a topic branch off of `master`
1. Commit patches
1. Open up a merge request, tagging at least two and assigning one of the [code owners](/.gitlab/CODEOWNERS) for the project.

It is the **assignee's** responsibility for clicking "merge" on the MR once all review comments have been resolved and the assignee is comfortable with the contents of the MR. Using a `WIP:` status on the MR serves as a flag to the assignee that the changeset is **not** ready to be merged, and serves as a method of control for the author over _when_ merging of the MR may be completed. The **author** is responsible for ensuring forward progress on the merge request.

Labels serve as a means for communicating "status" from an MR's author to its reviewers. Common helpful labels include:

- `Needs Review`
- `Waiting on QA`
- `Waiting on Deps`
- `Ready to Merge`
- `Blocked`

In general [commits should be atomic](https://en.wikipedia.org/wiki/Atomic_commit#Atomic_commit_convention) and diffs should be easy to read. This helps to ensure a timely feedback loop for MR authors.


## "Decision Making" Process

Code owners will take into consideration if a patch is in line with the general
principles of the project; meets the minimum standards for inclusion; and will
judge the general consensus of contributors.

In general, all merge requests must:

  - Have a clear use case, fix a demonstrable bug or serve the greater good of
    the project (for example refactoring for modularisation);
  - Be well peer reviewed;
  - Have unit tests where appropriate;
  - Not break the existing test suite;
  - Where bugs are fixed, where possible, there should be unit tests
    demonstrating the bug and also proving the fix. This helps prevent regression.

---

**Disclaimer:** A large portion of this Contribution guide was based off of [Bitcoin's OSS Contribution Guide](https://github.com/bitcoin/bitcoin/blob/v0.17.0.1/CONTRIBUTING.md)
