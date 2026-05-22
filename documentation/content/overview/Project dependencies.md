# Project dependency map

For each project chapter, the **read set** is the minimum set of upstream project repos a scaffolder agent has to read to build this project's starter. 

```mermaid
graph LR
    n032["032 themed surface"]
    n039["039 list+detail"]
    n045["045 data layer"]
    n051["051 server actions"]
    n054["054 email send"]
    n059["059 auth"]
    n063["063 org/RBAC"]
    n066["066 production list"]
    n069["069 Stripe webhook"]
    n071["071 CSV export"]
    n073["073 R2 upload"]
    n075["075 notifications"]
    n077["077 caching"]
    n079["079 rate limits"]
    n081["081 TanStack Query"]
    n083["083 Zustand wizard"]
    n086["086 audit pass"]
    n089["089 tri-locale"]
    n095["095 Stripe tests"]
    n099["099 observability"]
    n104["104 ship+migrate"]
    n108["108 PR review/ADR"]
    n112["112 AI chat"]

    n032 --> n039
    n039 --> n045
    n045 --> n051
    n051 --> n054
    n054 --> n059
    n059 --> n063
    n059 --> n079
    n063 --> n066
    n066 --> n069
    n066 --> n071
    n066 --> n083
    n066 --> n089
    n066 --> n104
    n066 --> n112
    n069 --> n075
    n069 --> n086
    n069 --> n095
    n071 --> n073
    n066 --> n077
    n071 --> n086
    n066 --> n081
    n077 --> n108
    n079 --> n086
    n086 --> n099
    n086 --> n108
    n089 --> n108
```
