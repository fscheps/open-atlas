# Security Policy

## Supported versions

Open Atlas is currently maintained as a single active branch project. Security fixes are expected to land on the default branch first.

## Reporting a vulnerability

Please do not open a public GitHub issue for suspected security vulnerabilities.

Preferred disclosure path:

1. Use GitHub private vulnerability reporting for the repository, if it is enabled.
2. If private reporting is not available, contact the maintainer through a private channel and include enough detail to reproduce the issue safely.

When reporting, please include:

- a short description of the issue
- affected files or features
- reproduction steps or a proof of concept
- impact assessment
- any suggested mitigation if you already have one

## Response expectations

The goal is to acknowledge reports quickly, validate them, and coordinate a fix before public disclosure when possible.

## Scope notes

Because Open Atlas is a static client-side app, the highest-priority classes of issues are:

- XSS or unsafe HTML/script injection
- malicious file import behavior
- dependency or CDN integrity risks
- client-side data exposure that surprises users
