import ExpoModulesCore

public class ExpoCutoutModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoCutout")

    AsyncFunction("setValueAsync") { (value: String) in
    }
  }
}
