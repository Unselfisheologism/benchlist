package com.ai.assistance.operit.voice.v2.actions

import android.content.Context

/**
 * Executes Voice v2 Actions by routing them through the AIToolHandler bridge.
 */
object ActionExecutor {

    /**
     * Execute any Action by dispatching to the appropriate AIToolHandler tool.
     */
    suspend fun execute(action: Action, context: Context): Result<String> {
        return when (action) {
            // App Control
            is Action.LaunchApp -> {
                val params = mutableMapOf("app_name" to action.appName)
                action.extras.forEach { (k, v) -> params["extra_$k"] = v }
                executeViaAIToolHandler("launch_app", params, context)
            }
            is Action.GoBack -> {
                executeViaAIToolHandler("go_back", mapOf("steps" to action.steps.toString()), context)
            }
            is Action.GoHome -> {
                executeViaAIToolHandler("go_home", emptyMap(), context)
            }
            is Action.OpenSettings -> {
                val params = mutableMapOf<String, String>()
                action.page?.let { params["page"] = it }
                executeViaAIToolHandler("open_settings", params, context)
            }
            is Action.SwitchApp -> {
                executeViaAIToolHandler("switch_app", mapOf("app_name" to action.appName), context)
            }
            is Action.CloseApp -> {
                executeViaAIToolHandler("close_app", mapOf("app_name" to action.appName), context)
            }
            is Action.GetCurrentActivity -> {
                executeViaAIToolHandler("get_current_activity", emptyMap(), context)
            }
            // Device Control
            is Action.GetBatteryStatus -> {
                executeViaAIToolHandler("get_battery_status", mapOf("detailed" to action.detailed.toString()), context)
            }
            is Action.TakePhoto -> {
                executeViaAIToolHandler("take_photo", mapOf("facing" to action.facing), context)
            }
            is Action.SendSms -> {
                executeViaAIToolHandler("send_sms", mapOf("phone_number" to action.phoneNumber, "message" to action.message), context)
            }
            is Action.ReadSms -> {
                val params = mutableMapOf("limit" to action.limit.toString())
                action.filterAddress?.let { params["filter_address"] = it }
                executeViaAIToolHandler("read_sms", params, context)
            }
            is Action.MakeCall -> {
                executeViaAIToolHandler("make_call", mapOf("phone_number" to action.phoneNumber), context)
            }
            is Action.ReadCallLog -> {
                val params = mutableMapOf("limit" to action.limit.toString())
                action.filterType?.let { params["filter_type"] = it }
                executeViaAIToolHandler("read_call_log", params, context)
            }
            is Action.GetClipboard -> {
                executeViaAIToolHandler("get_clipboard", emptyMap(), context)
            }
            is Action.SetClipboard -> {
                val params = mutableMapOf("text" to action.text)
                action.label?.let { params["label"] = it }
                executeViaAIToolHandler("set_clipboard", params, context)
            }
        }
    }

    /**
     * Bridge to route action execution through the existing AIToolHandler system.
     * This delegates to the core tool system so all tool implementations are reused.
     */
    private suspend fun executeViaAIToolHandler(
        toolName: String,
        params: Map<String, String>,
        context: Context
    ): Result<String> {
        return try {
            // Route through AIToolHandler which handles permissions, execution, and error handling
            com.ai.assistance.operit.ai.AIToolHandler.executeTool(
                toolName = toolName,
                params = params,
                context = context
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
