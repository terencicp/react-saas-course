# Chapter 2.6 prerequisites review

## Missing prerequisites

- Lesson 2.6.4 — `Role` type (concrete RBAC literal-union). Quote: "the role is the literal-union `Role` type from the permissions config". The type is used as already defined and importable in the augmentation example `interface Session { user: User & { id: UserId; orgId: OrgId; role: Role } }`, but no prior chapter introduces a `Role` type. RBAC and the permissions config are introduced in Unit 10 (Organizations and RBAC), which comes after Unit 2. Suggested source: new brief note in 2.6.4 that defines `Role` as a placeholder literal-union inline (e.g. `type Role = 'owner' | 'admin' | 'member'`), or replace `Role` with a simple inline union in the code example so the lesson does not rely on an undefined type. Severity: medium.
