# Changelog

## [0.1.1](https://github.com/QNSC-VN/opshub-web/compare/opshub-webv0.1.0...opshub-webv0.1.1) (2026-06-29)


### ✨ Features

* **auth:** Microsoft Entra ID SSO login ([9b899a1](https://github.com/QNSC-VN/opshub-web/commit/9b899a11d01d7669c9b698e78b997d8614057589))
* **auth:** skip login page, redirect straight to Microsoft ([4222dc8](https://github.com/QNSC-VN/opshub-web/commit/4222dc84f413de1c95043bc01ebfca79c638c1bc))
* **deploy:** enterprise-grade CI/CD pipeline ([415cf3d](https://github.com/QNSC-VN/opshub-web/commit/415cf3df96568abef0178e3a74a635ceaf52ca21))
* initial opshub-web scaffold ([14b8765](https://github.com/QNSC-VN/opshub-web/commit/14b8765731ce7f7e303a0d1f2cfc56e7afeba076))
* **people:** employee directory page with create, edit, status management ([8f353fc](https://github.com/QNSC-VN/opshub-web/commit/8f353fcb0f7b82921517079729d06154824389b9))
* **rbac:** gate UI on backend permissions, not hardcoded roles ([6885ab5](https://github.com/QNSC-VN/opshub-web/commit/6885ab54ae15e03ecba2aa5167362149fe1ebbf5))
* **web:** notification preferences page, my profile page, user identity in app-shell ([091c145](https://github.com/QNSC-VN/opshub-web/commit/091c145e69f5894d8a75dfd820cc7b499dd5a22a))
* **web:** notifications bell, requests inbox, reports dashboard, RBAC admin, audit logs ([112eba3](https://github.com/QNSC-VN/opshub-web/commit/112eba3123a8b7e97f22f95ea22b42dd0bf6955c))
* **web:** onboarding wizard, feature gates, nav FinOps + IT Catalog, RBAC fixes ([3c46506](https://github.com/QNSC-VN/opshub-web/commit/3c465065f7c2b1a7b1299e91a6c8141ab22f242a))
* **web:** onboarding/offboarding UI, webhooks settings page, regenerate API client ([ea83fd4](https://github.com/QNSC-VN/opshub-web/commit/ea83fd48e4f6593d2ee49e96a9ce669d5bc28e44))


### 🐛 Bug Fixes

* **auth:** clean enterprise auth — MSAL logout, fix stale types, remove role picker ([c4fa474](https://github.com/QNSC-VN/opshub-web/commit/c4fa47456810e3e3db3198c6fd78080d619314ad))
* default email, pageInfo field name, API types ([d2e6e45](https://github.com/QNSC-VN/opshub-web/commit/d2e6e453b019f422c177424536b5d7f17f3e107a))
* **husky:** fix PATH for non-interactive shell (NVM + Homebrew) ([9cc3e94](https://github.com/QNSC-VN/opshub-web/commit/9cc3e941f90b3bd5cadeed16c5d7b66e70b8daf6))
* rename qncs → qnsc across all resource names ([232a2fb](https://github.com/QNSC-VN/opshub-web/commit/232a2fba63ad451f370f049b7600dba9e1457917))
* replace qnsc.io with qnsc.vn in workflow comments ([3768cdc](https://github.com/QNSC-VN/opshub-web/commit/3768cdc98cc4a39422a2125cad1a78d0d405b6d6))
* **web:** add ErrorBoundary, fix 401 redirect, harden retry logic ([b878e7e](https://github.com/QNSC-VN/opshub-web/commit/b878e7e168e0fa3218807bcc351d8a2375164487))


### 🔒 Security

* add top-level permissions, harden .gitignore env wildcard ([1de821f](https://github.com/QNSC-VN/opshub-web/commit/1de821fe993d48f2c405c0bcfb33a4525e8268f2))

## Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- Release Please will automatically update this file on each release. -->
