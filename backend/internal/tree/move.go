package tree

import (
	"fmt"
	"strings"
)

type dropZone string

const (
	ZoneBefore dropZone = "before"
	ZoneAfter  dropZone = "after"
	ZoneChild  dropZone = "child"
)

// IsInvalidParent reports whether newParentID would create a cycle or nest under node's subtree.
func IsInvalidParent(nodes []Node, nodeID int64, newParentID *int64) bool {
	if newParentID == nil || nodeID == 0 {
		return false
	}
	if *newParentID == nodeID {
		return true
	}
	self := Find(nodes, nodeID)
	candidate := Find(nodes, *newParentID)
	if self == nil || candidate == nil {
		return true
	}
	prefix := self.TreePath + "."
	return candidate.ID == nodeID || strings.HasPrefix(candidate.TreePath, prefix)
}

// ApplyDrop moves dragID relative to targetID (Notion-style zones) and rebuilds paths.
func ApplyDrop(nodes []Node, dragID, targetID int64, zone string) ([]Node, error) {
	z := dropZone(zone)
	if z != ZoneBefore && z != ZoneAfter && z != ZoneChild {
		return nil, fmt.Errorf("invalid zone")
	}
	dragRow := Find(nodes, dragID)
	targetRow := Find(nodes, targetID)
	if dragRow == nil || targetRow == nil || dragID == targetID {
		return nil, fmt.Errorf("invalid drag")
	}
	oldParent := dragRow.ParentID
	var newParent *int64
	var insertIndex int

	if z == ZoneChild {
		if IsInvalidParent(nodes, dragID, &targetID) {
			return nil, fmt.Errorf("invalid parent")
		}
		newParent = &targetID
		dest := siblingsUnderParent(nodes, newParent, dragID)
		insertIndex = len(dest)
	} else {
		newParent = targetRow.ParentID
		if newParent != nil && IsInvalidParent(nodes, dragID, newParent) {
			return nil, fmt.Errorf("invalid parent")
		}
		dest := siblingsUnderParent(nodes, newParent, dragID)
		targetIdx := -1
		for i, r := range dest {
			if r.ID == targetID {
				targetIdx = i
				break
			}
		}
		if targetIdx < 0 {
			return nil, fmt.Errorf("invalid target")
		}
		if z == ZoneBefore {
			insertIndex = targetIdx
		} else {
			insertIndex = targetIdx + 1
		}
	}

	destSiblings := siblingsUnderParent(nodes, newParent, dragID)
	reordered := append([]Node{}, destSiblings...)
	dragCopy := *dragRow
	reordered = append(reordered[:insertIndex], append([]Node{dragCopy}, reordered[insertIndex:]...)...)

	orderByID := map[int64]int{}
	for i, r := range reordered {
		orderByID[r.ID] = (i + 1) * 10
	}
	if !SameParent(oldParent, newParent) {
		for i, r := range siblingsUnderParent(nodes, oldParent, dragID) {
			orderByID[r.ID] = (i + 1) * 10
		}
	}

	next := make([]Node, len(nodes))
	for i, r := range nodes {
		nr := r
		if r.ID == dragID {
			nr.ParentID = newParent
			if so, ok := orderByID[dragID]; ok {
				nr.SortOrder = so
			}
		} else if so, ok := orderByID[r.ID]; ok && r.SortOrder != so {
			nr.SortOrder = so
		}
		next[i] = nr
	}
	return RecomputePaths(next)
}

// SubtreeIDs returns rootID and all descendants by tree_path prefix.
func SubtreeIDs(nodes []Node, rootID int64) []int64 {
	root := Find(nodes, rootID)
	if root == nil {
		return nil
	}
	prefix := root.TreePath + "."
	var ids []int64
	for _, r := range nodes {
		if r.ID == rootID || strings.HasPrefix(r.TreePath, prefix) {
			ids = append(ids, r.ID)
		}
	}
	return ids
}
