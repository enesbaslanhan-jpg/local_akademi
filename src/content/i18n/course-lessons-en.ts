/**
 * English bodies for published canonical lessons.
 *
 * Turkish source lessons remain in the database. Only an explicit English
 * content request selects these bodies. Draft and archived courses are not
 * included here.
 */
export const COURSE_LESSON_EN_BY_SLUG: Record<string, string> = {
  'gercek-birim-maliyet-hesaplama-pusulasi': `# True Unit Cost Calculation Guide

## Practical Decision: "After adding every indirect and hidden expense to production or purchase cost, what is my product's true unit cost, and does that cost still allow me to protect my target profit margin?"

Many small businesses and e-commerce sellers treat only the purchase price or raw-material cost as the "product cost." True profitability requires more. Direct labor, special packaging, logistics, expected waste, and an appropriate share of fixed overhead must all be assigned to each unit. This guide provides a practical method for calculating true unit cost so that products do not generate hidden losses.

---

## 1. The Raw-Cost Illusion and the Components of True Unit Cost

The supplier price shown on an invoice, or the raw material used in production, is only the starting point. A sound profitability analysis assigns five core layers to each unit:

* **Raw materials or purchase price:** The amount on the supplier invoice, or the main material cost consumed in production.
* **Direct labor:** The unit's share of the fully loaded employer cost for the time spent producing, assembling, inspecting, or packing it.
* **Packaging:** The cost of boxes, protective materials, labels, inserts, and other packing materials used for one unit.
* **Shipping and distribution:** The net amount paid to deliver the product to the customer.
* **Waste and damage allowance:** The expected unit cost of production waste, storage damage, and transport loss.

Depending on the business, payment fees, marketplace commissions, return losses, and a share of fixed overhead may also belong in the decision. The rule is simple: include every cost that changes because the unit is produced or sold, plus the capacity cost that must be recovered for the business to remain sustainable.

---

## 2. Case Study: Sinem's Orthopedic Support Pillow

Sinem manufactures home-use medical supplies in Bursa. She wants to review the profitability of her best-selling orthopedic neck-support pillow. She knows that its materials cost **TRY 120** and sells it on a marketplace for **TRY 300**, so she assumes the product earns an excellent margin.

Let us calculate the true unit cost step by step.

### Step 1: Allocate Direct Labor

One craftsperson has a fully loaded monthly employer cost of **TRY 48,000**, including salary, social-security contributions, meals, and transport. The employee works eight hours a day for twenty days, providing **160 productive hours** per month.

* **Hourly labor cost:** $48{,}000\\ \\text{TRY} \\div 160\\ \\text{hours} = 300\\ \\text{TRY/hour}$
* Producing and quality-checking one pillow takes **12 minutes**, or **0.2 hours**.
* **Labor cost per pillow:** $300\\ \\text{TRY/hour} \\times 0.2\\ \\text{hours} = 60\\ \\text{TRY}$

### Step 2: Add Packaging

Each product uses a moisture-resistant bag, a custom cardboard box, and a branded insert.

* Cardboard box: TRY 12
* Protective bag: TRY 3
* Brand card: TRY 2
* **Total packaging cost:** $12 + 3 + 2 = 17\\ \\text{TRY}$

### Step 3: Add Shipping

Under Sinem's carrier agreement, the pillow's dimensional weight produces a net delivery charge of **TRY 45** per shipment.

### Step 4: Add Expected Waste

Cutting and stitching errors create average fabric waste of **5%**.

* Fabric portion of the unit's material cost: TRY 40
* **Expected waste cost per unit:** $40\\ \\text{TRY} \\times 0.05 = 2\\ \\text{TRY}$

### True Unit Cost Table

| Cost component | Sinem's assumption | True amount | Reason |
| :--- | :---: | :---: | :--- |
| Raw materials | TRY 120 | TRY 120 | Foam, zipper, and outer fabric |
| Direct labor | TRY 0 | TRY 60 | Twelve minutes of fully loaded labor |
| Packaging | TRY 0 | TRY 17 | Bag, box, and branded insert |
| Shipping | TRY 0 | TRY 45 | Net delivery tariff per unit |
| Waste allowance | TRY 0 | TRY 2 | Expected 5% cutting waste |
| **TRUE UNIT COST** | **TRY 120** | **TRY 244** | **The true cost is 103% above the assumption.** |

### What the Result Means

Sinem believed that selling a product costing TRY 120 for TRY 300 created TRY 180 of contribution and a 60% gross margin. Once the true unit cost is calculated at **TRY 244**, the product contributes only **TRY 56**, or approximately **18.7%** of the selling price. Marketplace commission and payment fees have not yet been deducted. If those deductions exceed TRY 56, each sale produces a loss even though the order volume and bank deposits may look healthy.

This is why pricing should begin with true unit economics rather than a supplier invoice. Update the calculation whenever wages, carrier tariffs, packaging prices, waste rates, or production time change.

---

## 3. Calculations and Decision Tools Integration

Use LocalKarar's **Actual Unit Cost** calculation to combine materials, labor, packaging, shipping, and expected waste on one basis. Then test whether the resulting price remains economically sustainable with **Is my product truly profitable? (DC-PROFIT-001)**.

[ Calculations > Actual Unit Cost ]
[ Decision Tools > Is my product truly profitable? (DC-PROFIT-001) ]

**Analysis steps in this tool:**

1. Enter the current selling price and every unit-level cost.
2. Check contribution amount and contribution margin.
3. Review the warning level and the assumptions that create the greatest risk.

---

## 4. Practical Knowledge Cards

### 💡 Formula Card: True Unit Cost

Use this formula to see the complete economic burden of one product:

$$\\text{True Unit Cost} = \\text{Unit Materials} + \\text{Unit Labor} + \\text{Unit Packaging} + \\text{Unit Shipping} + \\text{Expected Waste Loss}$$

When fixed production overhead is material to the decision, add a rational unit share based on practical capacity rather than maximum theoretical capacity.

### ⚠️ Mistake / Correct Card

**Common Mistake:** "The employee already receives a fixed monthly salary, so I do not need to assign labor cost to the new pillow model."

**Correct Approach:** Employee time is a limited resource. Every minute used by one product is capacity unavailable to another product. Allocate the time spent on each unit using the employee's fully loaded employer cost.

---

## 5. Verified Official Sources

1. [Turkish Revenue Administration — Tax Procedure guidance and communiqués](https://www.gib.gov.tr/)
2. [Social Security Institution — Employer contribution and labor-cost guidance](https://www.sgk.gov.tr/)

*Sources were checked for currency in August 2026. Confirm current tax, labor, and accounting treatment with a qualified professional before making a binding decision.*`,

  'karli-fiyat-mimarisi-ve-marj-yonetimi': `# Profitable Pricing Architecture and Margin Management

## Practical Decision: "Instead of copying competitors' prices blindly, how can I set sustainable floor and ceiling prices that include all of my true costs, damage and loss allowances, and target net profit margin?"

One of the fastest ways to destroy profitability is competitor-led price copying. You do not know a competitor's cost structure, tax position, purchasing power, cash needs, or whether the price you see is profitable at all. Using that price as your main reference can turn every sale into a quiet loss. A sound pricing process begins by distinguishing markup from margin, incorporating damage and spoilage risk, and building a flexible price corridor supported by the customer's perception of value.

---

## 1. Two Different Pricing Methods: Markup vs. Sales Margin

Two concepts are often confused in pricing mathematics:

* **Markup:** Add a percentage to product cost to calculate the selling price.

  $$\\text{Selling Price} = \\text{Cost} \\times (1 + \\text{Markup Rate})$$

* **Sales margin:** Decide what percentage of the final selling price should remain as profit.

  $$\\text{Selling Price} = \\frac{\\text{Cost}}{1 - \\text{Target Margin Rate}}$$

> **Important:** Adding 25% to cost is not the same as earning a 25% margin. If a product costs TRY 100 and you add 25%, the selling price is TRY 125. The TRY 25 profit is only 20% of the selling price.

Markup is useful as a quick internal reference, but a target-margin calculation is safer when the business needs a defined contribution after every unit-level cost. The denominator matters: markup compares profit with cost, while margin compares profit with revenue.

---

## 2. Case Study: Elif's Premium Gift Box

Elif sells personalized flower and gift boxes in Istanbul. She is designing a new Premium Birthday Box. The box's true unit cost, including the box, dried flowers, chocolate, and shipping, is **TRY 300**. Elif wants a **40% net margin**. She also wants a **5% damage allowance** for spoilage or damage during storage and delivery.

### Step 1: Load the Damage Allowance into the Cost Base

* True unit cost: TRY 300
* Damage or spoilage rate: 5%
* **Risk-adjusted cost base:**

  $$\\text{TRY }300 \\div (1 - 0.05) = \\text{TRY }315.79$$

The allowance is applied through the denominator so that the final price can absorb the expected loss. Simply adding 5% to cost and then applying other percentages can understate the price when several risks compound.

### Step 2: Apply the 40% Target Margin

* Target sales margin: 40%
* **Profitable selling price before VAT:**

  $$\\frac{\\text{TRY }315.79}{1 - 0.40} = \\frac{\\text{TRY }315.79}{0.60} \\approx \\text{TRY }526.32$$

### Step 3: Add VAT

Using the 20% VAT rate in this example:

$$\\text{TRY }526.32 \\times 1.20 \\approx \\text{TRY }631.58$$

The applicable tax rate and tax treatment must always be confirmed for the product and decision date.

### Pricing Comparison

| Method | Calculated price | Actual net margin | Risk assessment |
| :--- | :---: | :---: | :--- |
| **Incorrect: add 40% to cost** | TRY 420.00 | 21.4% after damage | **Risky:** expected losses erode the margin. |
| **Correct: damage allowance + 40% margin** | **TRY 631.58** | **40.0% with buffer** | **Safer:** protects the business and its target cash contribution. |

### What the Result Means

The floor price is not a number chosen by instinct. It is the minimum price that covers the verified economic cost and the return required to keep the offer sustainable. A commercial list price may be higher when customers value customization, speed, reliability, or service. It may sometimes be lower for a controlled promotion, but the business should know exactly which margin it is giving up and for how long.

A practical price corridor can therefore contain three reference points:

1. **Floor price:** The lowest sustainable price after cost, risk, tax, and channel deductions.
2. **Target price:** The price that produces the planned margin under normal conditions.
3. **Value ceiling:** The highest defensible price supported by customer value, alternatives, brand position, and service quality.

Review the corridor whenever supplier prices, wages, shipping rates, marketplace commissions, damage rates, or tax treatment change.

---

## 3. Decision Tools and Calculations

Use the LocalKarar calculations **Pricing Architecture and Target Margin (fiyat_mimarisi)** and **Profit and Profit Margin (kar_hesabi)** to combine variable expenses, commissions, return rates, and risk buffers.

Then test the proposed price with the decision tool **"Is my product truly profitable? (DC-PROFIT-001)"**.

\`\`\`
[ Calculations > Open Pricing Architecture and Target Margin ]
[ Calculations > Open Profit and Profit Margin ]
[ Decision Tools > Is my product truly profitable? (DC-PROFIT-001) ]
\`\`\`

Before accepting the result, verify that all inputs cover the same period and tax basis. A VAT-inclusive sales price must not be compared directly with VAT-exclusive costs without normalization. Likewise, marketplace commission, payment fees, shipping, packaging, and expected returns should be treated consistently as either unit values or rates.

---

## 4. Practical Knowledge Cards

### Formula Card: Target-margin Selling Price

Use this formula to incorporate both the target margin and an expected damage or waste allowance:

$$\\text{Selling Price before VAT} = \\frac{\\text{True Unit Cost}}{(1 - \\text{Damage Rate}) \\times (1 - \\text{Target Margin Rate})}$$

If channel commission is calculated as a percentage of the selling price, it also belongs in the denominator:

$$\\text{Selling Price} = \\frac{\\text{True Unit Cost}}{1 - \\text{Damage Rate} - \\text{Target Margin Rate} - \\text{Channel Rate}}$$

Use the second form only when the rates use the same price base and do not overlap. When contract terms use different bases, calculate each deduction separately in a price waterfall.

### Mistake / Correct Card

**Common Mistake:** "My product costs TRY 100 and I want 30% profit. If I sell it for TRY 130, my profit margin is 30%."

**Correct Approach:** A TRY 30 profit on a TRY 130 selling price is about 23%. To earn a true 30% sales margin on TRY 100 of cost, the price before other deductions must be $100 \\div (1 - 0.30) = \\text{TRY }142.86$.

### Decision Checklist

* Is the cost figure a true unit cost rather than only the supplier or material price?
* Are packaging, labor, shipping, payment fees, commissions, and expected returns included?
* Are price and cost values on the same VAT basis?
* Is the target expressed as markup or as margin, and does everyone use the same definition?
* Does the price still work under a reasonable damage, return, or discount scenario?
* Is the final price supported by customer value and current market evidence?
* Is there a named owner and date for the next pricing review?

---

## 5. Verified Official Sources

1. [Republic of Turkiye Ministry of Trade — Price Label Regulation and consumer guidance](https://ticaret.gov.tr/)
2. [Turkish Revenue Administration — VAT implementation guidance](https://www.gib.gov.tr/)

*Sources were checked for currency in August 2026. Tax rates, marketplace terms, and commercial rules can change; verify the current official rules on the decision date.*`,
}
