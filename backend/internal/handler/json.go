package handler

import (
	"encoding/json"
	"net/http"
)

func BindJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		JSONError(w, "invalid request", http.StatusBadRequest)
		return false
	}
	return true
}
