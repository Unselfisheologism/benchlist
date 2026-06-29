package com.ai.assistance.operit.voice.v2.actions

/**
 * Represents all possible actions the voice v2 overlay agent can perform.
 * Each action is a sealed class variant with its own parameters.
 */
sealed class Action {

    // App Control
    data class LaunchApp(val appName: String, val extras: Map<String, String> = emptyMap()) : Action()
    data class GoBack(val steps: Int = 1) : Action()
    data class GoHome : Action()
    data class OpenSettings(val page: String? = null) : Action()
    data class SwitchApp(val appName: String) : Action()
    data class CloseApp(val appName: String) : Action()
    data class GetCurrentActivity : Action()

    // Device Control
    data class GetBatteryStatus(val detailed: Boolean = false) : Action()
    data class TakePhoto(val facing: String = "back") : Action()
    data class SendSms(val phoneNumber: String, val message: String) : Action()
    data class ReadSms(val limit: Int = 10, val filterAddress: String? = null) : Action()
    data class MakeCall(val phoneNumber: String) : Action()
    data class ReadCallLog(val limit: Int = 20, val filterType: String? = null) : Action()
    data class GetClipboard : Action()
    data class SetClipboard(val text: String, val label: String? = null) : Action()

    companion object {
        /**
         * Parameter specification for an action.
         */
        data class ParamSpec(
            val name: String,
            val type: kotlin.reflect.KClass<*>,
            val description: String
        )

        /**
         * Describes a named action: its parameters and how to construct it from args.
         */
        data class Spec(
            val name: String,
            val description: String,
            val params: List<ParamSpec>,
            val build: (Map<String, Any?>) -> Action
        )

        /**
         * All known action specs, keyed by tool name.
         * Used by the LLM planner to know what tools are available.
         */
        val allSpecs: Map<String, Spec> = mapOf(
            "launch_app" to Spec(
                name = "launch_app",
                description = "Launch an installed application by name. Optionally pass extras.",
                params = listOf(
                    ParamSpec("app_name", String::class, "Name or package of the app to launch."),
                    ParamSpec("extras", Map::class, "Optional key-value extras to pass to the intent.")
                ),
                build = { args ->
                    @Suppress("UNCHECKED_CAST")
                    LaunchApp(
                        appName = args["app_name"] as String,
                        extras = args["extras"] as? Map<String, String> ?: emptyMap()
                    )
                }
            ),
            "go_back" to Spec(
                name = "go_back",
                description = "Press the back button. Optionally specify how many times.",
                params = listOf(
                    ParamSpec("steps", Int::class, "Number of back presses (default 1).")
                ),
                build = { args -> GoBack(args["steps"] as? Int ?: 1) }
            ),
            "go_home" to Spec(
                name = "go_home",
                description = "Press the home button to return to the home screen.",
                params = emptyList(),
                build = { _ -> GoHome }
            ),
            "open_settings" to Spec(
                name = "open_settings",
                description = "Open the system settings, optionally directly to a specific page.",
                params = listOf(
                    ParamSpec("page", String::class, "Optional settings page to open directly.")
                ),
                build = { args -> OpenSettings(args["page"] as? String) }
            ),
            "switch_app" to Spec(
                name = "switch_app",
                description = "Switch to a recently used application.",
                params = listOf(
                    ParamSpec("app_name", String::class, "Name of the app to switch to.")
                ),
                build = { args -> SwitchApp(args["app_name"] as String) }
            ),
            "close_app" to Spec(
                name = "close_app",
                description = "Close / force-stop a running application.",
                params = listOf(
                    ParamSpec("app_name", String::class, "Name of the app to close.")
                ),
                build = { args -> CloseApp(args["app_name"] as String) }
            ),
            "get_current_activity" to Spec(
                name = "get_current_activity",
                description = "Get the currently focused activity or foreground app.",
                params = emptyList(),
                build = { _ -> GetCurrentActivity }
            ),
            // Device Control
            "get_battery_status" to Spec(name = "get_battery_status", description = "Get current battery status including level, charging state, health, and temperature.", params = listOf(ParamSpec("detailed", Boolean::class, "If true, include detailed info like health and temperature.")), build = { args -> GetBatteryStatus(args["detailed"] as? Boolean ?: false) }),
            "take_photo" to Spec(name = "take_photo", description = "Take a photo using the device camera. Returns the file path of the saved photo.", params = listOf(ParamSpec("facing", String::class, "Camera to use: 'front' or 'back' (default).")), build = { args -> TakePhoto(args["facing"] as? String ?: "back") }),
            "send_sms" to Spec(name = "send_sms", description = "Send an SMS text message to a phone number.", params = listOf(ParamSpec("phone_number", String::class, "The phone number to send to."), ParamSpec("message", String::class, "The message text to send.")), build = { args -> SendSms(args["phone_number"] as String, args["message"] as String) }),
            "read_sms" to Spec(name = "read_sms", description = "Read recent SMS messages from the device.", params = listOf(ParamSpec("limit", Int::class, "Maximum messages to return (default 10)."), ParamSpec("filter_address", String::class, "Filter by phone number.")), build = { args -> ReadSms(args["limit"] as? Int ?: 10, args["filter_address"] as? String) }),
            "make_call" to Spec(name = "make_call", description = "Initiate a phone call to a phone number.", params = listOf(ParamSpec("phone_number", String::class, "The phone number to call.")), build = { args -> MakeCall(args["phone_number"] as String) }),
            "read_call_log" to Spec(name = "read_call_log", description = "Read recent call history from the device.", params = listOf(ParamSpec("limit", Int::class, "Maximum entries to return (default 20)."), ParamSpec("filter_type", String::class, "Filter: 'incoming', 'outgoing', or 'missed'.")), build = { args -> ReadCallLog(args["limit"] as? Int ?: 20, args["filter_type"] as? String) }),
            "get_clipboard" to Spec(name = "get_clipboard", description = "Get the current content of the system clipboard.", params = emptyList(), build = { _ -> GetClipboard }),
            "set_clipboard" to Spec(name = "set_clipboard", description = "Set text content to the system clipboard.", params = listOf(ParamSpec("text", String::class, "The text to copy to clipboard."), ParamSpec("label", String::class, "Optional label for the clipboard entry.")), build = { args -> SetClipboard(args["text"] as String, args["label"] as? String) })
        )
    }
}
