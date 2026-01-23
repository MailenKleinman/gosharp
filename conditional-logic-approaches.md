# Conditional Logic Approaches

Different ways of defining conditions, from simplest to most complex.

## 1. **One-to-One Mapping** (Simplest)

**Concept:** Direct parent-child dependency with a single value check.

**Example:**
- "Show field B only if field A equals 'Yes'"
- "Show phone number field if contact method is 'Phone'"

**Pros:**
- Very easy to understand and implement
- Simple UI (just a toggle or single value selector)
- No room for user error

**Cons:**
- Extremely limited - can't handle multiple conditions
- No AND/OR logic
- Can't do comparisons (greater than, contains, etc.)
- One parent, one value only

**JSON representation:**
```json
{
  "showIf": {
    "parentField": "contactMethod",
    "equals": "Phone"
  }
}
```

---

## 2. **JSON Schema / Rule-Based** (Middle Ground - Current Approach)

**Concept:** Structured conditional logic using predefined operators and AND/OR/NONE grouping.

**Example:**
- "Show field if ANY of these conditions are true:"
  - Parent equals "Option A"
  - Parent contains "Premium"
  - Parent is greater than 100

**Pros:**
- Handles most common use cases (80-90%)
- Still declarative and serializable
- UI can be generated from the structure
- Works well with JSON Schema's `if/then/else` or custom `x-conditions`
- Can be validated and type-checked

**Cons:**
- Can't handle complex nested logic like `(A AND B) OR (C AND D)`
- Limited to predefined operators
- Can't reference multiple fields or do calculations
- No dynamic/computed conditions

**JSON representation:**
```json
{
  "x-conditions": {
    "operator": "any",  // any, all, none
    "action": "show",   // show, hide
    "rules": [
      { "operator": "equals", "value": "Option A" },
      { "operator": "contains", "value": "Premium" },
      { "operator": "greaterThan", "value": 100 }
    ]
  }
}
```

---

## 3. **Code-Based / Expression Language** (Most Flexible)

**Concept:** Write actual expressions or code that evaluates to true/false.

**Example:**
- "Show field if: `(parent.value === 'A' && sibling.value > 100) || grandparent.type === 'Premium'`"
- Or using expression language: `"parent.age >= 18 && (parent.country === 'US' || parent.hasPassport === true)"`

**Pros:**
- Unlimited flexibility - can express any logic
- Can reference multiple fields at any level
- Can do calculations, transformations, regex matching
- Can call functions or use custom operators

**Cons:**
- Security risk (code injection if not sandboxed properly)
- Harder to validate and test
- Can't auto-generate UI for editing
- Requires technical knowledge to write
- Can become difficult to maintain
- Harder to debug when conditions fail

**Implementation options:**

**JavaScript expression (eval - dangerous):**
```json
{
  "showIf": "parent.age >= 18 && parent.country === 'US'"
}
```

**Safe expression language (like JSONLogic):**
```json
{
  "showIf": {
    "and": [
      { ">=": [{ "var": "parent.age" }, 18] },
      { "===": [{ "var": "parent.country" }, "US"] }
    ]
  }
}
```

**DSL (Domain Specific Language):**
```json
{
  "showIf": "parent.age >= 18 AND parent.country IN ['US', 'CA']"
}
```

---

## Recommendation by Use Case

- **Simple forms with basic dependencies** → Use **one-to-one mapping**
- **Most business forms with moderate complexity** → Use **JSON Schema / rule-based** (your current approach)
- **Advanced forms needing complex logic** → Use **expression language** (JSONLogic or similar safe DSL)
- **Internal tools where users are technical** → Consider **code-based** (with proper sandboxing)

Your current middle-ground approach is the sweet spot for most applications - it covers the majority of real-world scenarios while remaining manageable and user-friendly.
