package warehouse

func allowedChildTypes(parentType string) []string {
	switch parentType {
	case "warehouse":
		return []string{"zone"}
	case "zone":
		return []string{"shelf", "rack", "bin"}
	case "shelf":
		return []string{"rack", "bin"}
	case "rack":
		return []string{"bin"}
	default:
		return nil
	}
}

func validParent(childType, parentType string) bool {
	for _, t := range allowedChildTypes(parentType) {
		if t == childType {
			return true
		}
	}
	return false
}

func conditionTypes() []string {
	return []string{"shelf", "rack", "bin"}
}
