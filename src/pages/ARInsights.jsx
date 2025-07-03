import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Paper,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import dayjs from "dayjs";

export default function ARInsights() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barData, setBarData] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [donutData, setDonutData] = useState([]);

  const API_BASE = import.meta.env.VITE_API_INSIGHT_URL;

  useEffect(() => {
    axios.get(`${API_BASE}/ar-insights`)
      .then((res) => {
        const parsed = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

        const formatted = parsed.map((item, index) => {
          const dueDate = item.due_date !== "1970-01-15" ? dayjs(item.due_date) : null;
          const age = dueDate ? dayjs().diff(dueDate, "day") : null;

          return {
            id: index + 1,
            invoice_number: item.invoice_number || "—",
            total_amount: item.total_amount ?? 0,
            due_date: dueDate ? dueDate.format("YYYY-MM-DD") : null,
            month: dueDate ? dueDate.format("MMM YYYY") : null,
            age: age,
            age_bucket:
              age == null ? "Unknown" :
                age <= 0 ? "Current" :
                  age <= 15 ? "1–15 days" :
                    age <= 30 ? "16–30 days" :
                      ">30 days",
          };
        });

        setRows(formatted);

        // Bar Data
        const bar = {};
        formatted
        .filter(r => r.month)
        .forEach((r) => {
            if (!bar[r.month]) bar[r.month] = 0;
            bar[r.month] += r.total_amount;
        });
        setBarData(Object.entries(bar).map(([month, total]) => ({ month, total })));

        // Line Data (cumulative)
        const sorted = formatted
        .filter(r => r.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

        let running = 0;
        const line = sorted.map((r) => {
        running += r.total_amount;
        return { due_date: r.due_date, cumulative: running };
        });
        setLineData(line);

        // Donut Data
        const donut = {};
        formatted.forEach((r) => {
          if (!donut[r.age_bucket]) donut[r.age_bucket] = 0;
          donut[r.age_bucket] += 1;
        });
        setDonutData(Object.entries(donut).map(([age_bucket, count]) => ({ age_bucket, count })));

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching A/R insights:", err);
        setLoading(false);
      });
  }, []);

  const columns = [
    { field: "invoice_number", headerName: "Invoice Number", flex: 2 },
    { field: "total_amount", headerName: "Amount (INR)", flex: 1, type: "number" },
    { field: "due_date", headerName: "Due Date", flex: 1 },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Accounts Receivable Insights
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <Box sx={{ height: 300, width: "100%", mt: 3 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              sx={{ boxShadow: 3, borderRadius: 2 }}
            />
          </Box>

          <Grid container spacing={3} sx={{ mt: 4 }}>
                          {/* Bar Chart */}
            <Box sx={{ height: 300, width: "100%", mt: 3 }}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, height: 300 }}>
                    <Typography variant="h6" gutterBottom>Amount by Month</Typography>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barData}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#1976d2" />
                        </BarChart>
                    </ResponsiveContainer>
                    </Paper>
                </Grid>
                          </Box>

            <Box sx={{ height: 300, width: "50%", mt: 3 }}>              
                {/* Donut Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, height: 300 }}>
                    <Typography variant="h6" gutterBottom>Aging Buckets</Typography>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                        <Pie
                            data={donutData}
                            dataKey="count"
                            nameKey="age_bucket"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label
                        >
                            {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                    </Paper>
                </Grid>          
            </Box>

            <Box sx={{ height: 300, width: "100%", mt: 3 }}>
                {/* Line Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, height: 300 }}>
                    <Typography variant="h6" gutterBottom>Cumulative Receivables</Typography>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={lineData}>
                        <XAxis dataKey="due_date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="cumulative" stroke="#f57c00" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                    </Paper>
                </Grid>

            </Box>

                </Grid>
        </>
      )}
    </Box>
  );
}
