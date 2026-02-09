---
title: "Update Next-Up Info Display"
description: "Enhanced launcher to show last switched label with timestamp for better instance management"
version: "3.1.0"
date: 2026-02-09
tags:
  - feature
  - launcher
  - ui
---

# Update Next-Up Info Display

> 版本：v3.1.0 | 日期：2026-02-09 | 标签：v3.0.0

## 概述

本次发布增强了多账户启动器的用户体验，在 next-up 信息中显示最后切换标签的时间戳，便于用户更好地管理实例状态。

## 变更详情

### 新增功能（Added）

- **Next-Up Info Timestamp**：在启动器界面中添加最后切换标签的时间戳显示，帮助用户了解实例的最近活动状态。
  - 涉及文件：packages/extension/src/modules/launcher/core/

## 影响范围

- **涉及模块**：Launcher
- **配置变更**：无
- **破坏性变更**：无

## 提交记录

| Hash | 类型 | 描述 |
|------|------|------|
| 331e318 | feat | update next-up info to display last switched label with timestamp |