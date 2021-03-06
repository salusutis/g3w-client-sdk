export default {
    "it": {
      "sdk": {
        search: {
          all: 'TUTTE'
        },
        'metadata': {
          "title": "Metadati",
          'groups': {
            'general': {
              'title': 'GENERALE',
              'fields': {
                'title': 'TITOLO',
                'name': 'NOME',
                'description': "DESCRIZIONE",
                'abstract': "ABSTRACT",
                'keywords': 'PAROLE CHIAVE',
                "fees": "TASSE",
                "accessconstraints": "LIMITI DI ACCESSO",
                'contactinformation': "CONTATTI",
                'subfields': {
                  'contactinformation': {
                    'contactelectronicmailaddress': "Email",
                    'personprimary': 'Riferimenti',
                    'contactvoicetelephone': 'Telefono',
                    'contactorganization': 'Organizzazione',
                    'contactposition': 'Posizione',
                    'contactperson': 'Persona'
                  }
                },
                'wms_url': "WMS"
              }
            },
            'spatial':{
              'title': 'INFO SPAZIALI',
              'fields' : {
                'crs': 'EPSG',
                'extent': 'BBOX'
              }
            },
            'layers': {
              'title': 'STRATI',
              'groups' : {
                'general': 'GENERALE',
                'spatial': 'INFO SPAZIALI'
              },
              'fields': {
                'layers': 'STRATI',
                'subfields': {
                  'crs': 'EPSG',
                  'bbox': 'BBOX',
                  'title': "TITOLO",
                  'name': 'NOME',
                  'geometrytype': 'GEOMETRIA',
                  'source': 'SORGENTE',
                  'attributes': 'ATTRIBUTI',
                  'abstract': 'ABSTRACT',
                  'attribution': 'ATTRIBUTION',
                  'keywords': "PAROLE CHIAVE",
                  'metadataurl':'METADATA URL',
                  'dataurl': "DATA URL"
                }
              }
            }
          }
        },
        mapcontrols: {
          querybypolygon: {
            help: `<h4>Guida - Query By Polygon</h4>'
                  <ul>
                    <li>Seleziona uno strato poligonale in legenda.</li>
                    <li>Assicurati che lo strato sia visibile in mappa.</li>
                    <li>Clicca su una geometria dello strato selezionato.</li>
                  </ul>`
          },
          querybybbox: {
            help: `<h4>Guida - Query BBox layer</h4>
                   <ul>
                    <li>Disegna un rettangolo per interrogare gli strati evidenziati in giallo</li>
                   </ul>`
          }
        },
        form: {
          messages: {
            qgis_input_widget_relation: "Gestisci le relazioni tramite form dedicato"
          }
        }
      }
    },
    "en": {
      "sdk": {
        search: {
          all: 'ALL'
        },
        'metadata': {
          'title': 'Metadata',
          'groups': {
            'general': {
              'title': 'GENERAL',
              'fields': {
                'title': 'TITLE',
                'name': 'NAME',
                'description': "DESCRIPTION",
                'abstract': "ABASTRACT",
                'keywords': 'KEYWORDS',
                "fees": "FEES",
                "accessconstraints": "ACCESS CONSTRAINT",
                'contactinformation': "CONTACTS",
                'subfields': {
                  'contactinformation': {
                    'contactelectronicmailaddress': "Email",
                    'personprimary': 'Refereces',
                    'contactvoicetelephone': 'Phone',
                    'contactorganization': 'Organization',
                    'contactposition': 'Position',
                    'contactperson': 'Person'
                  }
                },
                'wms_url': "WMS"
              }
            },
            'spatial':{
              'title': 'SPATIAL',
              'fields' : {
                'crs': 'EPSG',
                'extent': 'BBOX'
              }
            },
            'layers': {
              'title': 'LAYERS',
              'fields': {
                'layers': 'LAYERS',
                'subfields': {
                  'crs': 'EPSG',
                  'bbox': 'BBOX',
                  'title': "TITLE",
                  'name': 'NAME',
                  'geometrytype': 'GEOMETRY',
                  'source': 'SOURCE',
                  'attributes': 'ATTRIBUTES',
                  'abstract': 'ABSTRACT',
                  'attribution': 'ATTRIBUTION',
                  'keywords': "PAROLE CHIAVE",
                  'metadataurl':'METADATA URL',
                  'dataurl': "DATA URL"

                }
              },
              'groups' : {
                'general': 'GENERAL',
                'spatial': 'SPATIAL'
              }
            }
          }
        },
        mapcontrols: {
          querybypolygon: {
            help: `<h4>Guide - Query By Polygon</h4>'
                  <ul>
                    <li>Select a polygon layer on TOC.</li>
                    <li>Be sure that layer is visible.</li>
                    <li>Click on a feature of selected layer.</li>
                  </ul>`
          },
          querybybbox: {
            help: `<h4>Guide - Query BBox layer</h4>
                   <ul>
                    <li>Draw a square on map to query underlined layers on TOC</li>
                   </ul>`
          }
        },
        form: {
          messages: {
            qgis_input_widget_relation: "Use relation specific form to work with relation"
          }
        }
      }
    }
 };
