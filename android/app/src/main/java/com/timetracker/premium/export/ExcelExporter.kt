package com.timetracker.premium.export

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.timetracker.premium.data.ProjectEntity
import com.timetracker.premium.data.WorkSessionEntity
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ExcelExporter {

    fun exportToExcelAndShare(
        context: Context,
        projects: List<ProjectEntity>,
        sessions: List<WorkSessionEntity>
    ) {
        val workbook = XSSFWorkbook()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
        val dateDayFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

        // --- SHEET 1: Detailed Sessions ---
        val sheet1 = workbook.createSheet("Detailed Sessions")
        val headerRow1 = sheet1.createRow(0)
        val headers1 = listOf("Date", "Start Time", "End Time", "Worked Duration (h)", "Project Name", "Notes")
        headers1.forEachIndexed { index, title ->
            val cell = headerRow1.createCell(index)
            cell.setCellValue(title)
        }

        var rowIdx1 = 1
        sessions.forEach { sess ->
            val proj = projects.find { it.id == sess.projectId } ?: return@forEach
            val row = sheet1.createRow(rowIdx1++)
            
            // Date
            row.createCell(0).setCellValue(dateDayFormat.format(Date(sess.startTime)))
            
            // Start Time
            row.createCell(1).setCellValue(dateFormat.format(Date(sess.startTime)))
            
            // End Time
            val endStr = if (sess.endTime != null) dateFormat.format(Date(sess.endTime)) else "Active Session"
            row.createCell(2).setCellValue(endStr)
            
            // Worked Duration
            val hours = sess.totalWorkedSeconds.toDouble() / 3600.0
            row.createCell(3).setCellValue(String.format(Locale.US, "%.2f", hours).toDouble())
            
            // Project Name
            row.createCell(4).setCellValue(proj.name)
            
            // Notes (Placeholder for future notes feature)
            row.createCell(5).setCellValue("Session ID: ${sess.id}")
        }

        sheet1.autoSizeColumn(0)
        sheet1.autoSizeColumn(1)
        sheet1.autoSizeColumn(2)
        sheet1.autoSizeColumn(3)
        sheet1.autoSizeColumn(4)
        sheet1.autoSizeColumn(5)

        // --- SHEET 2: Summary ---
        val sheet2 = workbook.createSheet("Summary")
        val headerRow2 = sheet2.createRow(0)
        val headers2 = listOf("Project", "Total Hours", "Hourly Rate", "Estimated Revenue")
        headers2.forEachIndexed { index, title ->
            val cell = headerRow2.createCell(index)
            cell.setCellValue(title)
        }

        var rowIdx2 = 1
        projects.forEach { proj ->
            val projSessions = sessions.filter { it.projectId == proj.id }
            val totalSec = projSessions.sumOf { it.totalWorkedSeconds }
            val totalHours = totalSec.toDouble() / 3600.0
            val rate = proj.hourlyRate ?: 0.0
            val revenue = totalHours * rate

            val row = sheet2.createRow(rowIdx2++)
            row.createCell(0).setCellValue(proj.name)
            row.createCell(1).setCellValue(String.format(Locale.US, "%.2f", totalHours).toDouble())
            row.createCell(2).setCellValue(rate)
            row.createCell(3).setCellValue(String.format(Locale.US, "%.2f", revenue).toDouble())
        }

        sheet2.autoSizeColumn(0)
        sheet2.autoSizeColumn(1)
        sheet2.autoSizeColumn(2)
        sheet2.autoSizeColumn(3)

        // Save workbook to Cache or External storage directory
        val cacheDir = context.cacheDir
        val fileName = "work_sessions_${System.currentTimeMillis()}.xlsx"
        val file = File(cacheDir, fileName)

        try {
            FileOutputStream(file).use { out ->
                workbook.write(out)
            }
            workbook.close()
            
            // Sharing Workbook via FileProvider & Intent Action
            val authority = "${context.packageName}.fileprovider"
            val uri = FileProvider.getUriForFile(context, authority, file)

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Premium Time Tracker Sessions Export")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            intentChooser(context, shareIntent, "Share Time Sessions XLSX")
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun intentChooser(context: Context, intent: Intent, title: String) {
        val chooser = Intent.createChooser(intent, title).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(chooser)
    }
}
