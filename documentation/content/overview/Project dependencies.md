# Project dependency map

For each project chapter, the **read set** is the minimum set of upstream project repos a scaffolder agent has to read to build this project's starter. 

```mermaid
graph LR
    n4_12["4.12 themed surface"]
    n5_7["5.7 list+detail"]
    n6_6["6.6 data layer"]
    n7_6["7.6 server actions"]
    n8_3["8.3 email send"]
    n9_5["9.5 auth"]
    n10_4["10.4 org/RBAC"]
    n11_3["11.3 production list"]
    n12_3["12.3 Stripe webhook"]
    n13_2["13.2 CSV export"]
    n13_4["13.4 R2 upload"]
    n14_2["14.2 notifications"]
    n15_2["15.2 caching"]
    n15_4["15.4 rate limits"]
    n16_2["16.2 TanStack Query"]
    n16_4["16.4 Zustand wizard"]
    n17_3["17.3 audit pass"]
    n18_3["18.3 tri-locale"]
    n19_6["19.6 Stripe tests"]
    n20_4["20.4 observability"]
    n21_5["21.5 ship+migrate"]
    n22_4["22.4 PR review/ADR"]
    n23_4["23.4 AI chat"]

    n4_12 --> n5_7
    n5_7 --> n6_6
    n6_6 --> n7_6
    n7_6 --> n8_3
    n8_3 --> n9_5
    n9_5 --> n10_4
    n9_5 --> n15_4
    n10_4 --> n11_3
    n11_3 --> n12_3
    n11_3 --> n13_2
    n11_3 --> n16_4
    n11_3 --> n18_3
    n11_3 --> n21_5
    n11_3 --> n23_4
    n12_3 --> n14_2
    n12_3 --> n17_3
    n12_3 --> n19_6
    n13_2 --> n13_4
    n13_2 --> n15_2
    n13_2 --> n17_3
    n15_2 --> n16_2
    n15_2 --> n22_4
    n15_4 --> n17_3
    n17_3 --> n20_4
    n17_3 --> n22_4
    n18_3 --> n22_4
```
