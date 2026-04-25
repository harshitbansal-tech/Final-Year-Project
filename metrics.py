import sqlite3
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# -----------------------------
# CONFIG
# -----------------------------
DB_PATH = "micropay.db"
ETH_PRICE_USD = 3000

# -----------------------------
# LOAD DATA
# -----------------------------
conn = sqlite3.connect(DB_PATH)
df = pd.read_sql_query("SELECT * FROM metrics", conn)

# -----------------------------
# CLEAN DATA
# -----------------------------
numeric_cols = ["l2CostWei", "amountWei", "latencyMs", "sendTs", "settledTs"]

for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.dropna(subset=["l2CostWei", "latencyMs", "sendTs", "settledTs"])
df = df[df["l2CostWei"] > 0]

# -----------------------------
# DERIVED FIELDS
# -----------------------------
df["latency"] = df["latencyMs"]
df["cost_eth"] = df["l2CostWei"] / 1e18
df["cost_usd"] = df["cost_eth"] * ETH_PRICE_USD

df_success = df[df["status"] == "settled"].copy()

# -----------------------------
# BASIC METRICS
# -----------------------------
avg_latency = df_success["latency"].mean()
p95_latency = df_success["latency"].quantile(0.95)

# -----------------------------
# STYLE
# -----------------------------
sns.set(style="whitegrid")

# -----------------------------
# 1. LATENCY DISTRIBUTION (KEEP)
# -----------------------------
plt.figure()
sns.histplot(df_success["latency"], bins=30, kde=True)

plt.axvline(avg_latency, linestyle="--", label="Mean")
plt.axvline(p95_latency, linestyle="--", label="P95")

plt.xlabel("Latency (ms)")
plt.ylabel("Frequency")
plt.title("Latency Distribution")
plt.legend()

plt.tight_layout()
plt.savefig("latency_distribution.png")
plt.close()

# -----------------------------
# 2. LATENCY BOXPLOT (KEEP)
# -----------------------------
plt.figure()
sns.boxplot(x=df_success["latency"])

plt.xlabel("Latency (ms)")
plt.title("Latency Spread (Boxplot)")

plt.tight_layout()
plt.savefig("latency_boxplot.png")
plt.close()

# -----------------------------
# 3. COST BOXPLOT (KEEP - VERY IMPORTANT)
# -----------------------------
plt.figure()
sns.boxplot(x=df_success["cost_usd"])

plt.xlabel("Cost (USD)")
plt.title("Cost Spread (Boxplot)")

plt.tight_layout()
plt.savefig("cost_boxplot.png")
plt.close()

# -----------------------------
# 4. LATENCY PER CHAIN (KEEP)
# -----------------------------
plt.figure()
sns.pointplot(x="chain", y="latency", data=df_success)

plt.ylabel("Latency (ms)")
plt.xlabel("Chain")
plt.title("Average Latency per Chain")

plt.tight_layout()
plt.savefig("latency_per_chain.png")
plt.close()

# -----------------------------
# 5. COST PER CHAIN (KEEP)
# -----------------------------
plt.figure()
sns.pointplot(x="chain", y="cost_usd", data=df_success)

plt.ylabel("Cost (USD)")
plt.xlabel("Chain")
plt.title("Average Cost per Chain")

plt.tight_layout()
plt.savefig("cost_per_chain.png")
plt.close()

# -----------------------------
# 6. THROUGHPUT (FIXED + CLEAN)
# -----------------------------
df_success = df_success.sort_values("settledTs")

df_success["time_sec"] = df_success["settledTs"] / 1000

# Create 2-second bins
df_success["time_bin"] = (df_success["time_sec"] // 2) * 2

throughput_series = df_success.groupby("time_bin").size().reset_index(drop=True)

plt.figure()
throughput_series.plot(kind="bar")

plt.xlabel("Time Window")
plt.ylabel("Transactions")
plt.title("Throughput Distribution")

plt.tight_layout()
plt.savefig("throughput.png")
plt.close()

# -----------------------------
# DONE
# -----------------------------
print("✅ Final clean graphs generated successfully.")